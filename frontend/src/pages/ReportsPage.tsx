import { FileBarChart } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export function ReportsPage() {
  return (
    <ComingSoon
      icon={FileBarChart}
      title="Reports"
      description="Employee List, Shift Allocation and Shift Diary reports will be available here."
      milestone="Planned — Milestone: Reports"
    />
  );
}
