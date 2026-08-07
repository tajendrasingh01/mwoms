import { useQuery } from "@tanstack/react-query";

import { fetchDashboardSummaryRequest, fetchShiftOverviewRequest } from "@/services/dashboard.service";

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
