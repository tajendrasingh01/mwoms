import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  calculatePmeDueDate,
  calculateVtcDueDate,
  serializeEmployee,
} from "@/lib/employee-utils";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
} from "@/types/employee.schema";

function buildExpiryFilter(status: string | undefined, field: "pmeExpiry" | "vtcExpiry") {
  if (!status) return undefined;
  const now = new Date();
  const warningThreshold = new Date();
  warningThreshold.setDate(now.getDate() + 30);

  switch (status) {
    case "VALID":
      return { [field]: { gt: warningThreshold } };
    case "DUE_SOON":
      return { [field]: { gt: now, lte: warningThreshold } };
    case "EXPIRED":
      return { [field]: { lt: now } };
    case "NOT_SET":
      return { [field]: null };
    default:
      return undefined;
  }
}

function getSessionUser(req: Request) {
  return req.session.user;
}

function sameDate(left: Date | null | undefined, right: Date | null | undefined) {
  return left?.getTime() === right?.getTime();
}

function getAbsenceDays(leaveStart: Date | null | undefined, leaveEnd: Date | null | undefined, fallback = 0) {
  if (!leaveStart || !leaveEnd) return fallback;
  return Math.max(0, Math.ceil((leaveEnd.getTime() - leaveStart.getTime()) / (1000 * 60 * 60 * 24)));
}

function getCertificationDates(data: {
  dateOfBirth: Date;
  employeeType: "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE";
  pmeDate?: Date | null;
  vtcDate?: Date | null;
  leaveStart?: Date | null;
  leaveEnd?: Date | null;
  rejoiningDate?: Date | null;
  absenceDays?: number | null;
}) {
  const absenceDays = getAbsenceDays(data.leaveStart, data.leaveEnd, data.absenceDays ?? 0);
  const pmeExpiry = data.pmeDate ? calculatePmeDueDate(data.dateOfBirth, data.pmeDate) : null;
  const vtcDate = data.employeeType !== "MONTHLY_RATED" && data.employeeType !== "STAFF" && data.employeeType !== "EXECUTIVE" ? data.vtcDate ?? null : null;
  const vtcExpiry = vtcDate
    ? calculateVtcDueDate(vtcDate, absenceDays, data.rejoiningDate)
    : null;

  return { pmeExpiry, vtcDate, vtcExpiry, absenceDays };
}

/**
 * Express 5's route param types allow `string | string[]` (to support
 * wildcard/regex routes). Our routes never produce array params, so
 * this narrows safely and 400s on the (should-never-happen) alternative.
 */
function getIdParam(req: Request, res: Response): string | null {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid id parameter" });
    return null;
  }
  return id;
}

/**
 * GET /api/employees
 * Supports free-text search (name or Employee ID), department filter,
 * active-status filter, and pagination — all optional.
 */
export async function listEmployees(req: Request, res: Response) {
  const parseResult = listEmployeesQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { search, department, relay, designation, employeeType, employmentStatus, pmeStatus, vtcStatus, isActive, page, pageSize } =
    parseResult.data;

  const where: Prisma.EmployeeWhereInput = {
    ...(department ? { department } : {}),
    ...(relay ? { relay } : {}),
    ...(designation ? { designation } : {}),
    ...(employeeType ? { employeeType } : {}),
    ...(employmentStatus ? { employmentStatus } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(pmeStatus ? buildExpiryFilter(pmeStatus, "pmeExpiry") : {}),
    ...(vtcStatus ? buildExpiryFilter(vtcStatus, "vtcExpiry") : {}),
  };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where }),
  ]);

  return res.json({
    data: employees.map(serializeEmployee),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

/** GET /api/employees/:id */
export async function getEmployee(req: Request, res: Response) {
  const id = getIdParam(req, res);
  if (!id) return;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const user = getSessionUser(req);
  if (user?.role === "SHIFT_INCHARGE" && user.relay && employee.relay !== user.relay) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }

  return res.json({ data: serializeEmployee(employee) });
}

/** POST /api/employees — Admin only (enforced by route middleware). */
export async function createEmployee(req: Request, res: Response) {
  const parseResult = createEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const existing = await prisma.employee.findUnique({
    where: { employeeId: parseResult.data.employeeId },
  });
  if (existing) {
    return res.status(409).json({ error: "Employee ID already exists" });
  }

  const { pmeExpiry: _pmeExpiry, vtcExpiry: _vtcExpiry, ...sourceData } = parseResult.data;
  const derived = getCertificationDates(sourceData);
  const employee = await prisma.$transaction(async (tx) => {
    const created = await tx.employee.create({ data: { ...sourceData, ...derived } });
    const history = [];
    if (created.pmeDate && created.pmeExpiry) history.push({ employeeId: created.id, type: "PME" as const, date: created.pmeDate, dueDate: created.pmeExpiry });
    if (created.vtcDate && created.vtcExpiry) history.push({ employeeId: created.id, type: "VTC" as const, date: created.vtcDate, dueDate: created.vtcExpiry });
    if (history.length) await tx.employeeCertification.createMany({ data: history });
    if (created.leaveStart) await tx.employeeAbsence.create({
      data: {
        employeeId: created.id,
        leaveStart: created.leaveStart,
        leaveEnd: created.leaveEnd,
        rejoiningDate: created.rejoiningDate,
        absenceDays: created.absenceDays,
      },
    });
    return created;
  });
  return res.status(201).json({ data: serializeEmployee(employee) });
}

/** PUT /api/employees/:id — Admin only (enforced by route middleware). */
export async function updateEmployee(req: Request, res: Response) {
  const id = getIdParam(req, res);
  if (!id) return;

  const parseResult = updateEmployeeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  if (
    parseResult.data.employeeId &&
    parseResult.data.employeeId !== employee.employeeId
  ) {
    const conflict = await prisma.employee.findUnique({
      where: { employeeId: parseResult.data.employeeId },
    });
    if (conflict) {
      return res.status(409).json({ error: "Employee ID already exists" });
    }
  }

  const { pmeExpiry: _pmeExpiry, vtcExpiry: _vtcExpiry, ...sourceData } = parseResult.data;
  const nextValues = {
    dateOfBirth: sourceData.dateOfBirth ?? employee.dateOfBirth,
    employeeType: sourceData.employeeType ?? employee.employeeType,
    pmeDate: sourceData.pmeDate === undefined ? employee.pmeDate : sourceData.pmeDate,
    vtcDate: sourceData.vtcDate === undefined ? employee.vtcDate : sourceData.vtcDate,
    leaveStart: sourceData.leaveStart === undefined ? employee.leaveStart : sourceData.leaveStart,
    leaveEnd: sourceData.leaveEnd === undefined ? employee.leaveEnd : sourceData.leaveEnd,
    rejoiningDate: sourceData.rejoiningDate === undefined ? employee.rejoiningDate : sourceData.rejoiningDate,
    absenceDays: sourceData.absenceDays === undefined ? employee.absenceDays : sourceData.absenceDays ?? 0,
  };
  const derived = getCertificationDates(nextValues);
  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.employee.update({
      where: { id },
      data: { ...sourceData, ...derived },
    });
    const history = [];
    if (result.pmeDate && result.pmeExpiry && !sameDate(result.pmeDate, employee.pmeDate)) history.push({ employeeId: id, type: "PME" as const, date: result.pmeDate, dueDate: result.pmeExpiry });
    if (result.vtcDate && result.vtcExpiry && !sameDate(result.vtcDate, employee.vtcDate)) history.push({ employeeId: id, type: "VTC" as const, date: result.vtcDate, dueDate: result.vtcExpiry });
    if (history.length) await tx.employeeCertification.createMany({ data: history });
    if (result.leaveStart && (
      !sameDate(result.leaveStart, employee.leaveStart) ||
      !sameDate(result.rejoiningDate, employee.rejoiningDate)
    )) await tx.employeeAbsence.create({
      data: {
        employeeId: id,
        leaveStart: result.leaveStart,
        leaveEnd: result.leaveEnd,
        rejoiningDate: result.rejoiningDate,
        absenceDays: result.absenceDays,
      },
    });
    return result;
  });
  return res.json({ data: serializeEmployee(updated) });
}

/**
 * DELETE /api/employees/:id — Admin only. Soft-deletes (isActive:
 * false) rather than hard-deleting, so shift allocation/diary history
 * referencing this employee (later milestones) stays intact.
 */
export async function deactivateEmployee(req: Request, res: Response) {
  const id = getIdParam(req, res);
  if (!id) return;

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return res.status(404).json({ error: "Employee not found" });
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: { isActive: false },
  });
  return res.json({ data: serializeEmployee(updated) });
}
