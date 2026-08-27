import type { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/types/auth.schema";

/**
 * POST /api/auth/login
 * Validates Employee ID + password against the users table, and on
 * success stores a minimal, non-sensitive payload in the session.
 * Deliberately returns the same generic error for "unknown employee
 * ID" and "wrong password" so login attempts can't be used to
 * enumerate valid employee IDs.
 */
export async function login(req: Request, res: Response) {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: "Invalid input",
      details: parseResult.error.flatten().fieldErrors,
    });
  }

  const { employeeId, password } = parseResult.data;

  const user = await prisma.user.findUnique({ where: { employeeId } });

  const GENERIC_ERROR = "Invalid Employee ID or password";

  if (!user || !user.isActive) {
    return res.status(401).json({ error: GENERIC_ERROR });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ error: GENERIC_ERROR });
  }

  req.session.user = {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    role: user.role,
    relay: user.relay ?? undefined,
  };

  return res.json({ user: req.session.user });
}

/** POST /api/auth/logout — destroys the session and clears the cookie. */
export function logout(req: Request, res: Response) {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to log out" });
    }
    res.clearCookie("mwoms.sid");
    return res.status(204).send();
  });
}

/** GET /api/auth/me — returns the current session's user, if any. */
export function me(req: Request, res: Response) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  return res.json({ user: req.session.user });
}
