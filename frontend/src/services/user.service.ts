import { apiClient } from "@/services/api-client";
import type { ShiftInChargeOption } from "@/types/shift-allocation";

export async function listShiftInChargeUsersRequest(): Promise<ShiftInChargeOption[]> {
  const { data } = await apiClient.get<{ data: ShiftInChargeOption[] }>(
    "/users/shift-incharges",
  );
  return data.data;
}
