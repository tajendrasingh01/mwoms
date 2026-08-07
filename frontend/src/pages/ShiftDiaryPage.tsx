import { NotebookPen } from "lucide-react";

import { ComingSoon } from "@/components/common/ComingSoon";

export function ShiftDiaryPage() {
  return (
    <ComingSoon
      icon={NotebookPen}
      title="Shift Diary"
      description="Record production, work done, equipment status, safety observations, pending work and handover notes for each date and shift."
      milestone="Planned — Milestone: Shift Diary"
    />
  );
}
