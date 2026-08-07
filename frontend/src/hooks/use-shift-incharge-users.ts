import { useQuery } from "@tanstack/react-query";

import { listShiftInChargeUsersRequest } from "@/services/user.service";

export function useShiftInChargeUsers() {
  return useQuery({
    queryKey: ["users", "shift-incharges"],
    queryFn: listShiftInChargeUsersRequest,
    staleTime: 5 * 60_000, // this list changes rarely
  });
}
