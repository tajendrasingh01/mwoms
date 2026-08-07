import type { ShiftAllocation, ShiftAllocationEmployee, Employee, User } from "@prisma/client";

import { serializeEmployee } from "@/lib/employee-utils";
import { getShiftStart, getShiftEnd, SHIFT_SCHEDULE, type ShiftTypeValue } from "@/constants/shift-schedule";

type ShiftAllocationWithRelations = ShiftAllocation & {
  shiftInCharge: Pick<User, "id" | "employeeId" | "name">;
  assignments: (ShiftAllocationEmployee & { employee: Employee })[];
};

export function serializeShiftAllocation(allocation: ShiftAllocationWithRelations) {
  const shiftType = allocation.shiftType as ShiftTypeValue;

  return {
    id: allocation.id,
    date: allocation.date.toISOString().slice(0, 10),
    shiftType,
    shiftLabel: SHIFT_SCHEDULE[shiftType].label,
    shiftStart: getShiftStart(allocation.date, shiftType).toISOString(),
    shiftEnd: getShiftEnd(allocation.date, shiftType).toISOString(),
    districtPanel: allocation.districtPanel,
    shiftInCharge: {
      id: allocation.shiftInCharge.id,
      employeeId: allocation.shiftInCharge.employeeId,
      name: allocation.shiftInCharge.name,
    },
    assignments: allocation.assignments.map((assignment) => ({
      id: assignment.id,
      authorizedWork: assignment.authorizedWork,
      employee: serializeEmployee(assignment.employee),
    })),
    headcount: allocation.assignments.length,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}

export type SerializedShiftAllocation = ReturnType<typeof serializeShiftAllocation>;
