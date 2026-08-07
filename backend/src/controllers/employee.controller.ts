import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeEmployee } from "@/lib/employee-utils";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  listEmployeesQuerySchema,
} from "@/types/employee.schema";

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

  const { search, department, isActive, page, pageSize } = parseResult.data;

  const where: Prisma.EmployeeWhereInput = {
    ...(department ? { department } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { employeeId: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
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

  const employee = await prisma.employee.create({ data: parseResult.data });
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

  const updated = await prisma.employee.update({
    where: { id },
    data: parseResult.data,
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
