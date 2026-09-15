import type { Request, Response } from "express";
import type { Employee } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getDueStatusForEmployee, getDaysUntil, isRetired } from "@/lib/employee-utils";

export interface ExpiryNotification {
  employeeId: string;
  employeeDbId: string;
  name: string;
  designation: string;
  type: "PME" | "VTC";
  status: "EXPIRED" | "DUE_SOON";
  expiryDate: string;
  daysLeft: number;
}

function buildNotifications(employees: Employee[]): ExpiryNotification[] {
  const notifications: ExpiryNotification[] = [];

  for (const employee of employees) {
    if (isRetired(employee.dateOfBirth)) continue;

    const pmeStatus = getDueStatusForEmployee(employee.dateOfBirth, employee.pmeExpiry);
    if ((pmeStatus === "EXPIRED" || pmeStatus === "DUE_SOON") && employee.pmeExpiry) {
      notifications.push({
        employeeId: employee.employeeId,
        employeeDbId: employee.id,
        name: employee.name,
        designation: employee.designation,
        type: "PME",
        status: pmeStatus,
        expiryDate: employee.pmeExpiry.toISOString(),
        daysLeft: getDaysUntil(employee.pmeExpiry),
      });
    }

    const vtcStatus = getDueStatusForEmployee(employee.dateOfBirth, employee.vtcExpiry);
    if ((vtcStatus === "EXPIRED" || vtcStatus === "DUE_SOON") && employee.vtcExpiry) {
      notifications.push({
        employeeId: employee.employeeId,
        employeeDbId: employee.id,
        name: employee.name,
        designation: employee.designation,
        type: "VTC",
        status: vtcStatus,
        expiryDate: employee.vtcExpiry.toISOString(),
        daysLeft: getDaysUntil(employee.vtcExpiry),
      });
    }
  }

  // Most urgent first: expired before due-soon, then soonest expiry first.
  return notifications.sort((a, b) => {
    if (a.status !== b.status) return a.status === "EXPIRED" ? -1 : 1;
    return a.daysLeft - b.daysLeft;
  });
}

/**
 * GET /api/notifications
 * Admin sees every active employee's near-expiry/expired PME & VTC.
 * Shift In-Charge sees only employees they've ever assigned to one of
 * their own shift rosters. Viewer gets an empty list — notifications
 * are an operational tool for people making allocation decisions.
 */
export async function getNotifications(req: Request, res: Response) {
  const user = req.session.user!;

  if (user.role === "VIEWER") {
    return res.json({ data: [] });
  }

  if (user.role === "ADMIN") {
    const employees = await prisma.employee.findMany({ where: { isActive: true } });
    return res.json({ data: buildNotifications(employees) });
  }

  // SHIFT_INCHARGE: only their own crew.
  const assignments = await prisma.shiftAllocationEmployee.findMany({
    where: { shiftAllocation: { shiftInChargeId: user.id } },
    include: { employee: true },
    distinct: ["employeeId"],
  });
  const employees = assignments
    .map((a) => a.employee)
    .filter((employee) => employee.isActive);

  return res.json({ data: buildNotifications(employees) });
}
