import type { Request, Response } from "express";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { serializeShiftAllocation } from "@/lib/shift-allocation-utils";
import {
  saveShiftAllocationSchema,
  listShiftAllocationsQuerySchema,
} from "@/types/shift-allocation.schema";

const allocationInclude = {
  shiftInCharge: { select: { id: true, employeeId: true, name: true } },
  assignments: { include: { employee: true } },
} satisfies Prisma.ShiftAllocationInclude;

function getIdParam(req: Request, res: Response): string | null {
  const { id } = req.params;
  if (typeof id !== "string") {
    res.status(400).json({ error: "Invalid id parameter" });
    return null;
  }
  return id;
}

/**
 * GET /api/shift-allocations
 * Filter by an exact date, a date range, shift type, district/panel,
 * or shift in-charge — this is both the "view previous allocations"
 * screen and the manager dashboard's data source.
 */
export async function listShiftAllocations(req: Request, res: Response) {
  const parseResult = listShiftAllocationsQuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid query parameters",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { date, dateFrom, dateTo, shiftType, districtPanel, shiftInChargeId, page, pageSize } =
    parseResult.data;

  const where: Prisma.ShiftAllocationWhereInput = {
    ...(date ? { date } : {}),
    ...(dateFrom || dateTo
      ? {
          date: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
    ...(shiftType ? { shiftType } : {}),
    ...(districtPanel ? { districtPanel } : {}),
    ...(shiftInChargeId ? { shiftInChargeId } : {}),
  };

  const [allocations, total] = await Promise.all([
    prisma.shiftAllocation.findMany({
      where,
      include: allocationInclude,
      orderBy: [{ date: "desc" }, { shiftType: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.shiftAllocation.count({ where }),
  ]);

  return res.json({
    data: allocations.map(serializeShiftAllocation),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  });
}

/** GET /api/shift-allocations/:id */
export async function getShiftAllocation(req: Request, res: Response) {
  const id = getIdParam(req, res);
  if (!id) return;

  const allocation = await prisma.shiftAllocation.findUnique({
    where: { id },
    include: allocationInclude,
  });
  if (!allocation) {
    return res.status(404).json({ error: "Shift allocation not found" });
  }
  return res.json({ data: serializeShiftAllocation(allocation) });
}

/**
 * POST /api/shift-allocations — Admin or Shift In-Charge only.
 * Create-or-replace semantics: a roster is uniquely identified by
 * (date, shiftType, districtPanel). Saving again for the same three
 * values replaces that roster's shift in-charge and full employee
 * list, rather than creating a duplicate — this matches "Save
 * Allocation" behaving like an editable draft for that shift, not an
 * append-only log.
 */
export async function saveShiftAllocation(req: Request, res: Response) {
  const parseResult = saveShiftAllocationSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { date, shiftType, districtPanel = "Shift Roster", shiftInChargeId, assignments } = parseResult.data;
  const userId = req.session.user!.id;

  const shiftInCharge = await prisma.user.findUnique({ where: { id: shiftInChargeId } });
  if (!shiftInCharge || !shiftInCharge.isActive) {
    return res.status(400).json({ error: "Selected shift in-charge is not a valid active user" });
  }
  if (shiftInCharge.role !== "ADMIN" && shiftInCharge.role !== "SHIFT_INCHARGE") {
    return res.status(400).json({ error: "Selected user is not authorized to be a shift in-charge" });
  }

  if (assignments.length > 0) {
    const employeeIds = assignments.map((a) => a.employeeId);
    const foundCount = await prisma.employee.count({
      where: { id: { in: employeeIds }, isActive: true },
    });
    if (foundCount !== new Set(employeeIds).size) {
      return res.status(400).json({ error: "One or more selected employees are invalid or inactive" });
    }
  }

  const existing = await prisma.shiftAllocation.findUnique({
    where: { date_shiftType_districtPanel: { date, shiftType, districtPanel } },
  });

  const allocation = await prisma.$transaction(async (tx) => {
    const saved = existing
      ? await tx.shiftAllocation.update({
          where: { id: existing.id },
          data: { shiftInChargeId },
        })
      : await tx.shiftAllocation.create({
          data: { date, shiftType, districtPanel, shiftInChargeId, createdById: userId },
        });

    // Replace the full assignment list — simplest correct semantics
    // for a "save this roster" action from a multi-select form.
    await tx.shiftAllocationEmployee.deleteMany({ where: { shiftAllocationId: saved.id } });
    if (assignments.length > 0) {
      await tx.shiftAllocationEmployee.createMany({
        data: assignments.map((a) => ({
          shiftAllocationId: saved.id,
          employeeId: a.employeeId,
          authorizedWork: a.authorizedWork,
        })),
      });
    }

    return tx.shiftAllocation.findUniqueOrThrow({
      where: { id: saved.id },
      include: allocationInclude,
    });
  });

  return res.status(existing ? 200 : 201).json({ data: serializeShiftAllocation(allocation) });
}

/** DELETE /api/shift-allocations/:id — Admin or Shift In-Charge only. */
export async function deleteShiftAllocation(req: Request, res: Response) {
  const id = getIdParam(req, res);
  if (!id) return;

  const allocation = await prisma.shiftAllocation.findUnique({ where: { id } });
  if (!allocation) {
    return res.status(404).json({ error: "Shift allocation not found" });
  }

  await prisma.shiftAllocation.delete({ where: { id } });
  return res.status(204).send();
}
