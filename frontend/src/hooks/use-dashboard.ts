import { useQuery } from "@tanstack/react-query";

import { fetchComplianceEmployeesRequest, fetchDashboardSummaryRequest, fetchShiftOverviewRequest } from "@/services/dashboard.service";
import type { ComplianceType } from "@/types/shift-allocation";

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: fetchDashboardSummaryRequest,
    refetchInterval: 60_000, // "current shift" changes over the day
  });
}

export function useShiftOverview(date: string) {
  return useQuery({
    queryKey: ["dashboard", "shift-overview", date],
    queryFn: () => fetchShiftOverviewRequest(date),
  });
}

export function useComplianceEmployees(type: ComplianceType | null) {
  return useQuery({
    queryKey: ["dashboard", "compliance", type],
    queryFn: () => fetchComplianceEmployeesRequest(type!),
    enabled: !!type,
  });
}
