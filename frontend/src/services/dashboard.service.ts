import { apiClient } from "@/services/api-client";
import type { ComplianceType, DashboardSummary, ShiftOverview } from "@/types/shift-allocation";
import type { Employee } from "@/types/employee";

export async function fetchDashboardSummaryRequest(): Promise<DashboardSummary> {
  const { data } = await apiClient.get<{ data: DashboardSummary }>("/dashboard/summary");
  return data.data;
}

export async function fetchShiftOverviewRequest(date: string): Promise<ShiftOverview> {
  const { data } = await apiClient.get<{ data: ShiftOverview }>("/dashboard/shift-overview", {
    params: { date },
  });
  return data.data;
}

export async function fetchComplianceEmployeesRequest(
  type: ComplianceType,
  search?: string,
  status?: "DUE_SOON" | "EXPIRED",
  employmentStatus?: "ACTIVE" | "TRANSFERRED" | "NOT_ENROLLED",
): Promise<Employee[]> {
  const { data } = await apiClient.get<{ data: Employee[] }>(`/dashboard/compliance/${type}`, {
    params: { ...(search ? { search } : {}), ...(status ? { status } : {}), ...(employmentStatus ? { employmentStatus } : {}) },
  });
  return data.data;
}
