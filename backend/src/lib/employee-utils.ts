import type { Employee, Prisma } from "@prisma/client";

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

export function calculateAgeAt(dateOfBirth: Date, onDate: Date): number {
  let age = onDate.getFullYear() - dateOfBirth.getFullYear();
  const hadBirthday =
    onDate.getMonth() > dateOfBirth.getMonth() ||
    (onDate.getMonth() === dateOfBirth.getMonth() && onDate.getDate() >= dateOfBirth.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function calculatePmeDueDate(dateOfBirth: Date, pmeDate: Date): Date {
  const ageAtPme = calculateAgeAt(dateOfBirth, pmeDate);
  const frequencyYears = ageAtPme <= 50 ? 3 : 1;
  return addYears(pmeDate, frequencyYears);
}

export function calculateVtcDueDate(vtcDate: Date, absenceDays = 0, rejoiningDate?: Date | null): Date {
  if (absenceDays > 365 && rejoiningDate) return addMonths(rejoiningDate, 1);
  return addYears(vtcDate, 5);
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

export function getDaysLeft(date: Date | null): number | null {
  return date ? getDaysUntil(date) : null;
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
    fatherName: employee.fatherName ?? null,
    dateOfBirth: employee.dateOfBirth.toISOString(),
    age: calculateAge(employee.dateOfBirth),
    experienceYrs: Number(employee.experienceYrs),
    designation: employee.designation,
    grade: employee.grade,
    department: employee.department,
    skill: employee.skill,
    dateOfJoining: employee.dateOfJoining.toISOString(),
    pmeDate: employee.pmeDate?.toISOString() ?? null,
    pmeExpiry: employee.pmeExpiry?.toISOString() ?? null,
    pmeDaysLeft: getDaysLeft(employee.pmeExpiry),
    pmeStatus: getExpiryStatus(employee.pmeExpiry),
    vtcDate: employee.vtcDate?.toISOString() ?? null,
    vtcExpiry: employee.vtcExpiry?.toISOString() ?? null,
    vtcDaysLeft: getDaysLeft(employee.vtcExpiry),
    leaveStart: employee.leaveStart?.toISOString() ?? null,
    leaveEnd: employee.leaveEnd?.toISOString() ?? null,
    rejoiningDate: employee.rejoiningDate?.toISOString() ?? null,
    absenceDays: employee.absenceDays,
    vtcStatus: getExpiryStatus(employee.vtcExpiry),
    medicalConditions: employee.medicalConditions ?? null,
    remark: employee.remark ?? null,
    relay: employee.relay,
    employeeType: employee.employeeType,
    isActive: employee.isActive,
    createdAt: employee.createdAt.toISOString(),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

export function serializeEmployeeRequest(request: {
  id: string;
  employeeId: string;
  name: string;
  fatherName: string | null;
  dateOfBirth: Date;
  experienceYrs: number | Prisma.Decimal;
  designation: string;
  department: string;
  skill: string;
  dateOfJoining: Date;
  pmeDate: Date | null;
  pmeExpiry: Date | null;
  vtcDate: Date | null;
  vtcExpiry: Date | null;
  medicalConditions: string | null;
  remark: string | null;
  relay: string;
  status: string;
  reviewComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy: { id: string; employeeId: string; name: string; role: string };
  reviewedBy?: { id: string; employeeId: string; name: string; role: string } | null;
}) {
  return {
    id: request.id,
    employeeId: request.employeeId,
    name: request.name,
    fatherName: request.fatherName ?? null,
    dateOfBirth: request.dateOfBirth.toISOString(),
    experienceYrs: Number(request.experienceYrs),
    designation: request.designation,
    department: request.department,
    skill: request.skill,
    dateOfJoining: request.dateOfJoining.toISOString(),
    pmeDate: request.pmeDate?.toISOString() ?? null,
    pmeExpiry: request.pmeExpiry?.toISOString() ?? null,
    vtcDate: request.vtcDate?.toISOString() ?? null,
    vtcExpiry: request.vtcExpiry?.toISOString() ?? null,
    medicalConditions: request.medicalConditions ?? null,
    remark: request.remark ?? null,
    relay: request.relay,
    status: request.status,
    reviewComment: request.reviewComment ?? null,
    requestedBy: request.requestedBy,
    reviewedBy: request.reviewedBy ?? null,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

export type SerializedEmployee = ReturnType<typeof serializeEmployee>;
