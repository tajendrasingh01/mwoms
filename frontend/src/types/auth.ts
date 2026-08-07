import type { UserRole } from "@/types/nav";

export interface SessionUser {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
}

export interface LoginPayload {
  employeeId: string;
  password: string;
}
