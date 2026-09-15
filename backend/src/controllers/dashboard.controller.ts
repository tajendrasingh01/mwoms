import type { Request, Response } from "express";

import { prisma } from "@/lib/prisma";
import { getDueStatusForEmployee, isRetired } from "@/lib/employee-utils";
import { serializeShiftAllocation } from "@/lib/shift-allocation-utils";
import { serializeEmployee } from "@/lib/employee-utils";
import { SHIFT_TYPES, SHIFT_SCHEDULE, type ShiftTypeValue } from "@/constants/shift-schedule";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Which shift is active right now, and which calendar date its
 * allocation would be filed under. THIRD (23:00–07:00) needs both
 * "today" and "yesterday" checked, since after midnight its
 * allocation date is still yesterday's date.
 */
function getCurrentShift(now = new Date()): { shiftType: ShiftTypeValue; date: Date } | null {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now).reduce<Record<string, string>>((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  const today = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`);
  const previous = new Date(today);
  previous.setUTCDate(previous.getUTCDate() - 1);
  const ranges: Record<ShiftTypeValue, [number, number]> = {
    GENERAL: [360, 840], FIRST: [660, 1140], SECOND: [960, 1440], THIRD: [1380, 420],
  };
  for (const shiftType of SHIFT_TYPES) {
    const [start, end] = ranges[shiftType];
    const active = start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
    if (active) return { shiftType, date: minutes < end && start > end ? previous : today };
  }
  return null;
}

/**
 * GET /api/dashboard/summary
 * Powers the Dashboard's KPI tiles. "Vacant Positions" has no staffing
 * plan / sanctioned-strength data model yet (that would need a
 * separate "required headcount per panel" concept the spec doesn't
 * define) — it's returned as 0 with a note rather than a fabricated
 * number; wire it up once that data exists.
 */
export async function getDashboardSummary(_req: Request, res: Response) {
  const current = getCurrentShift();

  const [totalEmployees, employees, allocatedCount] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.employee.findMany({
      where: { isActive: true, employmentStatus: "ACTIVE" },
      select: { dateOfBirth: true, pmeExpiry: true, vtcExpiry: true },
    }),
    current
      ? prisma.shiftAllocationEmployee.count({
          where: {
            shiftAllocation: { date: current.date, shiftType: current.shiftType },
          },
        })
      : Promise.resolve(0),
  ]);

  const pmeDueSoon = employees.filter((e) => {
    if (isRetired(e.dateOfBirth)) return false;
    const s = getDueStatusForEmployee(e.dateOfBirth, e.pmeExpiry);
    return s === "DUE_SOON";
  }).length;
  const pmeExpired = employees.filter((e) => {
    if (isRetired(e.dateOfBirth)) return false;
    return getDueStatusForEmployee(e.dateOfBirth, e.pmeExpiry) === "EXPIRED";
  }).length;
  const vtcDueSoon = employees.filter((e) => {
    if (isRetired(e.dateOfBirth)) return false;
    const s = getDueStatusForEmployee(e.dateOfBirth, e.vtcExpiry);
    return s === "DUE_SOON";
  }).length;
  const vtcExpired = employees.filter((e) => {
    if (isRetired(e.dateOfBirth)) return false;
    return getDueStatusForEmployee(e.dateOfBirth, e.vtcExpiry) === "EXPIRED";
  }).length;

  return res.json({
    data: {
      currentShift: current
        ? { shiftType: current.shiftType, label: SHIFT_SCHEDULE[current.shiftType].label }
        : null,
      totalEmployees,
      allocatedEmployees: allocatedCount,
      pmeDue: pmeDueSoon + pmeExpired,
      pmeDueSoon,
      pmeExpired,
      vtcDue: vtcDueSoon + vtcExpired,
      vtcDueSoon,
      vtcExpired,
      vacantPositions: 0, // see note above
    },
  });
}

/** GET /api/dashboard/compliance/:type */
export async function getComplianceEmployees(req: Request, res: Response) {
  const type = req.params.type;
  if (type !== "pme" && type !== "vtc") {
    return res.status(400).json({ error: "Compliance type must be pme or vtc" });
  }

  const now = new Date();
  const dueSoon = new Date(now);
  dueSoon.setDate(dueSoon.getDate() + 30);
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  const statusParam = typeof req.query.status === "string" ? req.query.status : undefined;
  const employmentStatus = typeof req.query.employmentStatus === "string" ? req.query.employmentStatus : undefined;
  const expiryField = type === "pme" ? "pmeExpiry" : "vtcExpiry";
  const expiryStatus = statusParam === "DUE_SOON" || statusParam === "EXPIRED" ? statusParam : undefined;
  const dueSoonFilter = expiryStatus === "DUE_SOON"
    ? { gt: now, lte: dueSoon }
    : expiryStatus === "EXPIRED"
      ? { lt: now }
      : { lte: dueSoon };
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      employmentStatus: employmentStatus === "TRANSFERRED" || employmentStatus === "NOT_ENROLLED" ? employmentStatus : "ACTIVE",
      [expiryField]: dueSoonFilter,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { employeeId: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ [expiryField]: "asc" }, { name: "asc" }],
  });

  const filtered = employees.filter((employee) => !isRetired(employee.dateOfBirth));

  return res.json({ data: filtered.map(serializeEmployee) });
}

/**
 * GET /api/dashboard/shift-overview?date=YYYY-MM-DD
 * The manager dashboard: every shift roster for the given date (all
 * four shift types, across every district/panel), each with its
 * assigned employees, their authorization/PME/VTC status, and the
 * shift's actual start/end date-time. Defaults to today.
 */
export async function getShiftOverview(req: Request, res: Response) {
  const dateParam = typeof req.query.date === "string" ? req.query.date : undefined;
  const date = startOfDay(dateParam ? new Date(dateParam) : new Date());

  if (Number.isNaN(date.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  const allocations = await prisma.shiftAllocation.findMany({
    where: { date },
    include: {
      shiftInCharge: { select: { id: true, employeeId: true, name: true } },
      assignments: { include: { employee: true } },
    },
    orderBy: [{ shiftType: "asc" }, { districtPanel: "asc" }],
  });

  const serialized = allocations.map(serializeShiftAllocation);

  const byShiftType = SHIFT_TYPES.map((shiftType) => ({
    shiftType,
    label: SHIFT_SCHEDULE[shiftType].label,
    allocations: serialized.filter((a) => a.shiftType === shiftType),
  }));

  return res.json({ data: { date: date.toISOString().slice(0, 10), shifts: byShiftType } });
}
