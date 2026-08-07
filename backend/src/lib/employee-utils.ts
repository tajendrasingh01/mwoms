import type { Employee } from "@prisma/client";

/** Age in completed years as of today, from a date of birth. */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() &&
      today.getDate() >= dateOfBirth.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

const EXPIRY_WARNING_WINDOW_DAYS = 30;

export type ExpiryStatus = "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET";

export function getExpiryStatus(expiry: Date | null): ExpiryStatus {
  if (!expiry) return "NOT_SET";
  const now = new Date();
  const warningThreshold = new Date();
  warningThreshold.setDate(now.getDate() + EXPIRY_WARNING_WINDOW_DAYS);

  if (expiry < now) return "EXPIRED";
  if (expiry <= warningThreshold) return "DUE_SOON";
  return "VALID";
}

/** Whole days from now until `date` (negative if already past). */
export function getDaysUntil(date: Date): number {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - now.getTime()) / msPerDay);
}

/**
 * Shape returned to the frontend: Decimal -> number for JSON safety,
 * plus derived fields (age, PME/VTC status) the UI needs but the DB
 * shouldn't store (they'd go stale).
 */
export function serializeEmployee(employee: Employee) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    dateOfBirth: employee.dateOfBirth.toISOString(),
    age: calculateAge(employee.dateOfBirth),
    experienceYrs: Number(employee.experienceYrs),
    designation: employee.designation,
    department: employee.department,
    skill: employee.skill,
    dateOfJoining: employee.dateOfJoining.toISOString(),
    pmeExpiry: employee.pmeExpiry?.toISOString() ?? null,
    pmeStatus: getExpiryStatus(employee.pmeExpiry),
    vtcExpiry: employee.vtcExpiry?.toISOString() ?? null,
    vtcStatus: getExpiryStatus(employee.vtcExpiry),
    isActive: employee.isActive,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export type SerializedEmployee = ReturnType<typeof serializeEmployee>;
