export type ExpiryStatus = "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET";

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  dateOfBirth: string;
  age: number;
  experienceYrs: number;
  designation: string;
  department: string;
  skill: string;
  dateOfJoining: string;
  pmeExpiry: string | null;
  pmeStatus: ExpiryStatus;
  vtcExpiry: string | null;
  vtcStatus: ExpiryStatus;
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
  department: string;
  skill: string;
  dateOfJoining: string;
  pmeExpiry: string | null;
  vtcExpiry: string | null;
  isActive: boolean;
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
  page?: number;
  pageSize?: number;
}
