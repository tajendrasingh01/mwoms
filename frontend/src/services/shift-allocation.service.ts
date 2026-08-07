import { apiClient } from "@/services/api-client";
import type {
  ShiftAllocation,
  ShiftAllocationListResponse,
  SaveShiftAllocationPayload,
} from "@/types/shift-allocation";

export async function listShiftAllocationsRequest(params: {
  date?: string;
  page?: number;
  pageSize?: number;
}): Promise<ShiftAllocationListResponse> {
  const { data } = await apiClient.get<ShiftAllocationListResponse>("/shift-allocations", {
    params,
  });
  return data;
}

export async function saveShiftAllocationRequest(
  payload: SaveShiftAllocationPayload,
): Promise<ShiftAllocation> {
  const { data } = await apiClient.post<{ data: ShiftAllocation }>(
    "/shift-allocations",
    payload,
  );
  return data.data;
}
