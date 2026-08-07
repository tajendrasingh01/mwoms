import { useQuery } from "@tanstack/react-query";

import { listNotificationsRequest } from "@/services/notification.service";
import { useAuth } from "@/store/auth-store";

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: listNotificationsRequest,
    enabled: !!user && user.role !== "VIEWER",
    staleTime: 60_000,
    refetchInterval: 5 * 60_000, // poll every 5 minutes so the bell stays current
  });
}
