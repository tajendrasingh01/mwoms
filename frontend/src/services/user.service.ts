import { apiClient } from "@/services/api-client";
import type { ShiftInChargeOption } from "@/types/shift-allocation";
import type { User, CreateUserPayload } from "@/types/user";

export async function listShiftInChargeUsersRequest(): Promise<ShiftInChargeOption[]> {
  const { data } = await apiClient.get<{ data: ShiftInChargeOption[] }>(
    "/users/shift-incharges",
  );
  return data.data;
}

export async function listUsersRequest(): Promise<User[]> {
  const { data } = await apiClient.get<{ data: User[] }>("/users");
  return data.data;
}

export async function createUserRequest(payload: CreateUserPayload): Promise<User> {
  const { data } = await apiClient.post<{ data: User }>("/users", payload);
  return data.data;
}
