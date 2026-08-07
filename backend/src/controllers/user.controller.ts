import type { Request, Response } from "express";

import { prisma } from "@/lib/prisma";

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
