import type { Request, Response } from "express";

import { prisma } from "@/lib/prisma";
import { getExpiryStatus } from "@/lib/employee-utils";
import { serializeShiftAllocation } from "@/lib/shift-allocation-utils";
import { SHIFT_TYPES, isShiftActive, SHIFT_SCHEDULE, type ShiftTypeValue } from "@/constants/shift-schedule";

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
  const today = startOfDay(now);
  const yesterday = startOfDay(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  for (const shiftType of SHIFT_TYPES) {
    if (isShiftActive(today, shiftType, now)) return { shiftType, date: today };
    if (isShiftActive(yesterday, shiftType, now)) return { shiftType, date: yesterday };
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
      where: { isActive: true },
      select: { pmeExpiry: true, vtcExpiry: true },
    }),
    current
      ? prisma.shiftAllocationEmployee.count({
          where: {
            shiftAllocation: { date: current.date, shiftType: current.shiftType },
          },
        })
      : Promise.resolve(0),
  ]);

  const pmeDue = employees.filter((e) => {
    const s = getExpiryStatus(e.pmeExpiry);
    return s === "DUE_SOON" || s === "EXPIRED";
  }).length;
  const vtcDue = employees.filter((e) => {
    const s = getExpiryStatus(e.vtcExpiry);
    return s === "DUE_SOON" || s === "EXPIRED";
  }).length;

  return res.json({
    data: {
      currentShift: current
        ? { shiftType: current.shiftType, label: SHIFT_SCHEDULE[current.shiftType].label }
        : null,
      totalEmployees,
      allocatedEmployees: allocatedCount,
      pmeDue,
      vtcDue,
      vacantPositions: 0, // see note above
    },
  });
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
