import { apiClient } from "@/services/api-client";
import type { ExpiryNotification } from "@/types/shift-allocation";

export async function listNotificationsRequest(): Promise<ExpiryNotification[]> {
  const { data } = await apiClient.get<{ data: ExpiryNotification[] }>("/notifications");
  return data.data;
}
