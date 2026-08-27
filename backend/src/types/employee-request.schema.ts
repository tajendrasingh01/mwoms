import { z } from "zod";

const relayEnum = z.enum(["RELAY_A", "RELAY_B", "RELAY_C"]);
const statusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);

export const createEmployeeRequestSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  fatherName: z.string().trim().optional().nullable(),
  dateOfBirth: z.coerce.date(),
  experienceYrs: z.coerce.number().min(0, "Experience can't be negative"),
  designation: z.string().trim().min(1, "Designation is required"),
  department: z.string().trim().min(1, "Department is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  dateOfJoining: z.coerce.date(),
  pmeDate: z.coerce.date().optional().nullable(),
  pmeExpiry: z.coerce.date().optional().nullable(),
  vtcDate: z.coerce.date().optional().nullable(),
  vtcExpiry: z.coerce.date().optional().nullable(),
  medicalConditions: z.string().trim().optional().nullable(),
  remark: z.string().trim().optional().nullable(),
  relay: relayEnum,
});

export const reviewEmployeeRequestSchema = z.object({
  id: z.string().cuid(),
  status: statusEnum,
  reviewComment: z.string().trim().optional().nullable(),
});
