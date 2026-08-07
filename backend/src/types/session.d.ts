import "express-session";
import type { Role } from "@prisma/client";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      employeeId: string;
      name: string;
      role: Role;
    };
  }
}
