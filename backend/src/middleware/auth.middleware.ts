import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";

/** Blocks the request unless a valid session exists. */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return next();
}

/**
 * Blocks the request unless the session's user has one of the given
 * roles. Always call after requireAuth (or compose: requireRole
 * implies a session is present, but checking both keeps error
 * messages accurate if used standalone).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
