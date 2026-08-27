export type ExpiryStatus = "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET";

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  fatherName: string | null;
  dateOfBirth: string;
  age: number;
  experienceYrs: number;
  designation: string;
  grade: string | null;
  department: string;
  skill: string;
  dateOfJoining: string;
  pmeDate: string | null;
  pmeExpiry: string | null;
  pmeDaysLeft: number | null;
  pmeStatus: ExpiryStatus;
  vtcDate: string | null;
  vtcExpiry: string | null;
  vtcDaysLeft: number | null;
  vtcStatus: ExpiryStatus;
  leaveStart: string | null;
  leaveEnd: string | null;
  rejoiningDate: string | null;
  absenceDays: number;
  medicalConditions: string | null;
  remark: string | null;
  relay: "RELAY_A" | "RELAY_B" | "RELAY_C";
  employeeType: "DAILY_RATED" | "MONTHLY_RATED" | "STAFF";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormValues {
  employeeId: string;
  name: string;
  dateOfBirth: string;
  experienceYrs: number;
  designation: string;
  grade?: string | null;
  department: string;
  skill: string;
  dateOfJoining: string;
  pmeDate: string | null;
  vtcDate: string | null;
  leaveStart: string | null;
  leaveEnd: string | null;
  rejoiningDate: string | null;
  relay: "Relay A" | "Relay B" | "Relay C";
  isActive: boolean;
  employeeType: "DAILY_RATED" | "MONTHLY_RATED" | "STAFF";
}

export interface EmployeeImportPreviewError {
  row: number;
  employeeId?: string;
  field?: string;
  error: string;
}

export interface EmployeeImportPreviewData {
  total: number;
  valid: number;
  invalid: number;
  newCount: number;
  updateCount: number;
  duplicateRows: number;
  errors: EmployeeImportPreviewError[];
  cleaning?: string[];
}

export interface EmployeeImportResult {
  total: number;
  added: number;
  updated: number;
  failed: number;
}

export interface EmployeeListResponse {
  data: Employee[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface EmployeeListParams {
  search?: string;
  employeeType?: "DAILY_RATED" | "MONTHLY_RATED" | "STAFF";
  designation?: string;
  department?: string;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
