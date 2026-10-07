import { Badge } from "@/components/ui/badge";
import type { PmeStatus, VtcStatus } from "@/types/employee";

const STATUS_CONFIG: Record<
  PmeStatus | VtcStatus,
  { label: string; variant: "success" | "warning" | "danger" | "secondary" }
> = {
  VALID: { label: "Valid", variant: "success" },
  "DUE TODAY": { label: "Due today", variant: "warning" },
  OVERDUE: { label: "Overdue", variant: "danger" },
  NOT_SET: { label: "Not set", variant: "secondary" },
  RETIRED: { label: "Retired", variant: "secondary" },
  "N/A": { label: "N/A", variant: "secondary" },
};

export function ExpiryStatusBadge({ status }: { status: PmeStatus | VtcStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
