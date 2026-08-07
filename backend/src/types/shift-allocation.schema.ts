import { z } from "zod";

import { SHIFT_TYPES } from "@/constants/shift-schedule";

const shiftTypeEnum = z.enum(SHIFT_TYPES);

const assignmentSchema = z.object({
  employeeId: z.string().min(1),
  authorizedWork: z.string().trim().max(200).optional(),
});

export const saveShiftAllocationSchema = z.object({
  date: z.coerce.date(),
  shiftType: shiftTypeEnum,
  districtPanel: z.string().trim().min(1, "District/Panel is required"),
  shiftInChargeId: z.string().min(1, "Shift In-Charge is required"),
  assignments: z
    .array(assignmentSchema)
    .max(500, "Too many employees in one allocation"),
});

export const listShiftAllocationsQuerySchema = z.object({
  date: z.coerce.date().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  shiftType: shiftTypeEnum.optional(),
  districtPanel: z.string().trim().optional(),
  shiftInChargeId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type SaveShiftAllocationInput = z.infer<typeof saveShiftAllocationSchema>;
export type ListShiftAllocationsQuery = z.infer<typeof listShiftAllocationsQuerySchema>;
