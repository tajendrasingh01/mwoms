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

export function isRetired(dateOfBirth: Date | null | undefined): boolean {
  return dateOfBirth ? calculateAge(dateOfBirth) >= 60 : false;
}

function addYears(date: Date, years: number): Date {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

export function calculatePmeDueDate(dateOfBirth: Date, pmeDate: Date): Date | null {
  if (isRetired(dateOfBirth)) return null;
  const ageAtPme = calculateAgeAt(dateOfBirth, pmeDate);
  if (ageAtPme >= 60) return null;
  const frequencyYears = ageAtPme < 45 ? 5 : 3;
  return addYears(pmeDate, frequencyYears);
}

export function calculateVtcDueDate(vtcDate: Date): Date {
  return addYears(vtcDate, 4);
}

const EXPIRY_WARNING_WINDOW_DAYS = 30;

export type ExpiryStatus = "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET";
export type CertificationStatus = "OVERDUE" | "DUE TODAY" | "VALID" | "NOT_SET";
export type PmeStatus = CertificationStatus | "RETIRED";
export type VtcStatus = CertificationStatus | "N/A";

function getCertificationStatus(expiry: Date | null): CertificationStatus {
  if (!expiry) return "NOT_SET";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (expiry < today) return "OVERDUE";
  if (expiry < tomorrow) return "DUE TODAY";
  return "VALID";
}

export function getPmeStatus(dateOfBirth: Date | null | undefined, expiry: Date | null): PmeStatus {
  if (dateOfBirth && isRetired(dateOfBirth)) return "RETIRED";
  return getCertificationStatus(expiry);
}

export function getVtcStatus(employeeType: Employee["employeeType"], expiry: Date | null): VtcStatus {
  if (employeeType !== "DAILY_RATED") return "N/A";
  return getCertificationStatus(expiry);
}

export function getExpiryStatus(expiry: Date | null): ExpiryStatus {
  if (!expiry) return "NOT_SET";
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const warningThreshold = new Date(today);
  warningThreshold.setUTCDate(warningThreshold.getUTCDate() + EXPIRY_WARNING_WINDOW_DAYS);

  if (expiry < today) return "EXPIRED";
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
  const pmeExpiry =
    !isRetired(employee.dateOfBirth) && employee.dateOfBirth && employee.pmeDate
      ? calculatePmeDueDate(employee.dateOfBirth, employee.pmeDate)
      : null;
  const vtcDate = employee.employeeType === "DAILY_RATED" ? employee.vtcDate : null;
  const vtcExpiry = vtcDate ? calculateVtcDueDate(vtcDate) : null;

  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    fatherName: employee.fatherName ?? null,
    dateOfBirth: employee.dateOfBirth?.toISOString() ?? null,
    age: employee.dateOfBirth ? calculateAge(employee.dateOfBirth) : null,
    experienceYrs: Number(employee.experienceYrs),
    designation: employee.designation,
    grade: employee.grade,
    department: employee.department,
    skill: employee.skill,
    dateOfJoining: employee.dateOfJoining?.toISOString() ?? null,
    pmeDate: employee.pmeDate?.toISOString() ?? null,
    pmeExpiry: pmeExpiry?.toISOString() ?? null,
    pmeDaysLeft: getDaysLeft(pmeExpiry),
    pmeStatus: getPmeStatus(employee.dateOfBirth, pmeExpiry),
    vtcDate: vtcDate?.toISOString() ?? null,
    vtcExpiry: vtcExpiry?.toISOString() ?? null,
    vtcDaysLeft: getDaysLeft(vtcExpiry),
    leaveStart: employee.leaveStart?.toISOString() ?? null,
    leaveEnd: employee.leaveEnd?.toISOString() ?? null,
    rejoiningDate: employee.rejoiningDate?.toISOString() ?? null,
    absenceDays: employee.absenceDays,
    vtcStatus: getVtcStatus(employee.employeeType, vtcExpiry),
    medicalConditions: employee.medicalConditions ?? null,
    remark: employee.remark ?? null,
    relay: employee.relay,
    employeeType: employee.employeeType,
    employmentStatus: employee.employmentStatus,
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
