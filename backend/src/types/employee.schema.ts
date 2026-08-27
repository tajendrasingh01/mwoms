import { z } from "zod";

const dateString = z.coerce.date();
const relayEnum = z.enum(["Relay A", "Relay B", "Relay C"]);
const relayInternal = z.enum(["RELAY_A", "RELAY_B", "RELAY_C"]);
const employeeType = z.enum(["DAILY_RATED", "MONTHLY_RATED", "STAFF"]).default("DAILY_RATED");
const expiryStatusEnum = z.enum(["EXPIRED", "DUE_SOON", "VALID", "NOT_SET"]);

const relayTransform = relayEnum.transform((value) => {
  switch (value) {
    case "Relay A":
      return "RELAY_A" as const;
    case "Relay B":
      return "RELAY_B" as const;
    case "Relay C":
      return "RELAY_C" as const;
  }
});

export const createEmployeeSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  fatherName: z.string().trim().optional().nullable(),
  dateOfBirth: dateString,
  experienceYrs: z.coerce.number().min(0, "Experience can't be negative").default(0),
  designation: z.string().trim().min(1, "Designation is required"),
  grade: z.string().trim().optional().nullable(),
  department: z.string().trim().min(1, "Department is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  dateOfJoining: dateString,
  pmeDate: dateString.nullish(),
  pmeExpiry: dateString.nullish(),
  vtcDate: dateString.nullish(),
  vtcExpiry: dateString.nullish(),
  leaveStart: dateString.nullish(),
  leaveEnd: dateString.nullish(),
  rejoiningDate: dateString.nullish(),
  absenceDays: z.coerce.number().int().min(0).nullish(),
  medicalConditions: z.string().trim().optional().nullable(),
  remark: z.string().trim().optional().nullable(),
  relay: relayTransform,
  employeeType,
  isActive: z.boolean().default(true),
});

export const updateEmployeeSchema = createEmployeeSchema.partial().extend({
  // employeeId is the natural key; allow updating it but never blank.
  employeeId: z.string().trim().min(1, "Employee ID is required").optional(),
});

export const listEmployeesQuerySchema = z.object({
  search: z.string().trim().optional(),
  relay: relayInternal.optional(),
  designation: z.string().trim().optional(),
  employeeType: z.enum(["DAILY_RATED", "MONTHLY_RATED", "STAFF"]).optional(),
  department: z.string().trim().optional(),
  pmeStatus: expiryStatusEnum.optional(),
  vtcStatus: expiryStatusEnum.optional(),
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
