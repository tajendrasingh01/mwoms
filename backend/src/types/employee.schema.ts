import { z } from "zod";

const dateString = z.coerce.date();

export const createEmployeeSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  dateOfBirth: dateString,
  experienceYrs: z.coerce.number().min(0, "Experience can't be negative"),
  designation: z.string().trim().min(1, "Designation is required"),
  department: z.string().trim().min(1, "Department is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  dateOfJoining: dateString,
  pmeExpiry: dateString.nullish(),
  vtcExpiry: dateString.nullish(),
  isActive: z.boolean().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  // employeeId is the natural key; allow updating it but never blank.
  employeeId: z.string().trim().min(1, "Employee ID is required").optional(),
});

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().optional(),
  department: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
