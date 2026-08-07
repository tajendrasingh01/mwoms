import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiTone = "default" | "success" | "warning" | "danger";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: KpiTone;
  hint?: string;
}

const TONE_STYLES: Record<KpiTone, string> = {
  default: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
};

/**
 * Single KPI tile used across the Dashboard (Current Shift, Total
 * Employees, Allocated Employees, PME Due, VTC Due, Vacant Positions).
 * Data is wired to the backend in a later milestone; for now it
 * renders whatever is passed in, including the loading placeholders.
 */
export function KpiCard({ label, value, icon: Icon, tone = "default", hint }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{label}</CardTitle>
        <div className={cn("flex size-8 items-center justify-center rounded-md", TONE_STYLES[tone])}>
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
