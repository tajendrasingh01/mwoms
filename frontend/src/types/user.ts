export type UserRole = "ADMIN" | "SHIFT_INCHARGE" | "VIEWER";

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  employeeId: string;
  name: string;
  password: string;
  role: UserRole;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
}
