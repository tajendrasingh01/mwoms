import { z } from "zod";

const roleEnum = z.enum(["ADMIN", "SHIFT_INCHARGE", "VIEWER"]);
const relayEnum = z.enum(["RELAY_A", "RELAY_B", "RELAY_C"]).optional();

export const createUserSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleEnum,
  relay: relayEnum,
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
