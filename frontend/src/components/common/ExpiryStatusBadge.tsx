import { Badge } from "@/components/ui/badge";
import type { ExpiryStatus } from "@/types/employee";

const STATUS_CONFIG: Record<
  ExpiryStatus,
  { label: string; variant: "success" | "warning" | "danger" | "secondary" }
> = {
  VALID: { label: "Valid", variant: "success" },
  DUE_SOON: { label: "Due soon", variant: "warning" },
  EXPIRED: { label: "Expired", variant: "danger" },
  NOT_SET: { label: "Not set", variant: "secondary" },
};

export function ExpiryStatusBadge({ status }: { status: ExpiryStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
