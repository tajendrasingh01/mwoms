import type { UserRole } from "@/types/nav";

export interface SessionUser {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
}

export interface LoginPayload {
  employeeId: string;
  password: string;
}
