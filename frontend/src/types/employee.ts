export type CertificationStatus = "OVERDUE" | "DUE TODAY" | "VALID" | "NOT_SET";
export type PmeStatus = CertificationStatus | "RETIRED";
export type VtcStatus = CertificationStatus | "N/A";
export type EmploymentStatus = "ACTIVE" | "TRANSFERRED" | "NOT_ENROLLED";

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  fatherName: string | null;
  dateOfBirth: string | null;
  age: number | null;
  experienceYrs: number;
  designation: string;
  grade: string | null;
  department: string;
  skill: string;
  dateOfJoining: string | null;
  pmeDate: string | null;
  pmeExpiry: string | null;
  pmeDaysLeft: number | null;
  pmeStatus: PmeStatus;
  vtcDate: string | null;
  vtcExpiry: string | null;
  vtcDaysLeft: number | null;
  vtcStatus: VtcStatus;
  leaveStart: string | null;
  leaveEnd: string | null;
  rejoiningDate: string | null;
  absenceDays: number;
  medicalConditions: string | null;
  remark: string | null;
  relay: "RELAY_A" | "RELAY_B" | "RELAY_C";
  employeeType: "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE";
  employmentStatus: EmploymentStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeFormValues {
  employeeId?: string;
  name: string;
  dateOfBirth?: string | null;
  experienceYrs?: number;
  designation: string;
  grade?: string | null;
  department: string;
  skill?: string | null;
  dateOfJoining?: string | null;
  pmeDate?: string | null;
  vtcDate?: string | null;
  leaveStart?: string | null;
  leaveEnd?: string | null;
  rejoiningDate?: string | null;
  relay?: "Relay A" | "Relay B" | "Relay C" | null;
  isActive?: boolean;
  employeeType: "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE";
  employmentStatus?: EmploymentStatus;
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
  employeeType?: "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE";
  designation?: string;
  department?: string;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
  pmeStatus?: PmeStatus;
  vtcStatus?: VtcStatus;
  employmentStatus?: EmploymentStatus;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
