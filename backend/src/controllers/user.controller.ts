import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createUserSchema } from "@/types/user.schema";

/**
 * GET /api/users/shift-incharges
 * Active users who can be assigned as a shift's in-charge (Admins can
 * also stand in as one). Returns only the fields the allocation
 * form's dropdown needs — never passwordHash.
 */
export async function listShiftInChargeUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["ADMIN", "SHIFT_INCHARGE"] } },
    select: { id: true, employeeId: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
  return res.json({ data: users });
}

/**
 * GET /api/users
 * Admin-only user management list.
 */
export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      employeeId: true,
      name: true,
      role: true,
      relay: true,
      isActive: true,
      createdAt: true,
    },
  });
  return res.json({ data: users });
}

/**
 * POST /api/users
 * Admin-only user creation.
 */
export async function createUser(req: Request, res: Response) {
  const parseResult = createUserSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { employeeId, name, password, role, relay } = parseResult.data;

  const existing = await prisma.user.findUnique({ where: { employeeId } });
  if (existing) {
    return res.status(409).json({ error: "Employee ID already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      employeeId,
      name,
      passwordHash,
      role,
      relay,
    },
  });

  return res.status(201).json({
    data: {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role,
      relay: user.relay,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
  });
}
