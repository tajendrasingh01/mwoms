import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listShiftAllocationsRequest,
  saveShiftAllocationRequest,
  deleteShiftAllocationRequest,
} from "@/services/shift-allocation.service";
import type { SaveShiftAllocationPayload } from "@/types/shift-allocation";

const SHIFT_ALLOCATIONS_QUERY_KEY = "shift-allocations" as const;

export function useShiftAllocations(params: { date?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [SHIFT_ALLOCATIONS_QUERY_KEY, params],
    queryFn: () => listShiftAllocationsRequest(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useSaveShiftAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SaveShiftAllocationPayload) => saveShiftAllocationRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIFT_ALLOCATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteShiftAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteShiftAllocationRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIFT_ALLOCATIONS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
