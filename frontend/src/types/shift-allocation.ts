import type { ShiftTypeValue } from "@/constants/shift-schedule";
import type { Employee } from "@/types/employee";

export interface ShiftInChargeOption {
  id: string;
  employeeId: string;
  name: string;
  role: "ADMIN" | "SHIFT_INCHARGE";
}

export interface ShiftAssignment {
  id: string;
  authorizedWork: string | null;
  employee: Employee;
}

export interface ShiftAllocation {
  id: string;
  date: string;
  shiftType: ShiftTypeValue;
  shiftLabel: string;
  shiftStart: string;
  shiftEnd: string;
  districtPanel: string;
  shiftInCharge: { id: string; employeeId: string; name: string };
  assignments: ShiftAssignment[];
  headcount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftAllocationListResponse {
  data: ShiftAllocation[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface SaveShiftAllocationPayload {
  date: string;
  shiftType: ShiftTypeValue;
  districtPanel: string;
  shiftInChargeId: string;
  assignments: { employeeId: string; authorizedWork?: string }[];
}

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

export interface DashboardSummary {
  currentShift: { shiftType: ShiftTypeValue; label: string } | null;
  totalEmployees: number;
  allocatedEmployees: number;
  pmeDue: number;
  vtcDue: number;
  vacantPositions: number;
}

export interface ShiftOverviewGroup {
  shiftType: ShiftTypeValue;
  label: string;
  allocations: ShiftAllocation[];
}

export interface ShiftOverview {
  date: string;
  shifts: ShiftOverviewGroup[];
}
