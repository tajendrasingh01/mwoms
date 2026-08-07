import { apiClient } from "@/services/api-client";
import type { DashboardSummary, ShiftOverview } from "@/types/shift-allocation";

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
