import { useState } from "react";
import { Clock, Users, CalendarCheck, HeartPulse, GraduationCap, UserX, Loader2 } from "lucide-react";

import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { useDashboardSummary, useShiftOverview } from "@/hooks/use-dashboard";
import { useAuth } from "@/store/auth-store";
import { SHIFT_SCHEDULE } from "@/constants/shift-schedule";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Current Shift"
          value={isSummaryLoading ? "…" : (summary?.currentShift?.label ?? "None active")}
          icon={Clock}
        />
        <KpiCard
          label="Total Employees"
          value={isSummaryLoading ? "…" : (summary?.totalEmployees ?? 0)}
          icon={Users}
        />
        <KpiCard
          label="Allocated (Current Shift)"
          value={isSummaryLoading ? "…" : (summary?.allocatedEmployees ?? 0)}
          icon={CalendarCheck}
          tone="success"
        />
        <KpiCard
          label="PME Due"
          value={isSummaryLoading ? "…" : (summary?.pmeDue ?? 0)}
          icon={HeartPulse}
          tone="warning"
          hint="Periodical Medical Examination — due soon or expired"
        />
        <KpiCard
          label="VTC Due"
          value={isSummaryLoading ? "…" : (summary?.vtcDue ?? 0)}
          icon={GraduationCap}
          tone="warning"
          hint="Vocational Training Certificate — due soon or expired"
        />
        <KpiCard
          label="Vacant Positions"
          value={isSummaryLoading ? "…" : (summary?.vacantPositions ?? 0)}
          icon={UserX}
          tone="danger"
          hint="Not yet tracked — no staffing plan configured"
        />
      </div>

      {(user?.role === "ADMIN" || user?.role === "SHIFT_INCHARGE") && <ShiftOverviewSection />}
    </div>
  );
}

function ShiftOverviewSection() {
  const [date, setDate] = useState(todayISO());
  const { data, isLoading } = useShiftOverview(date);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-semibold text-foreground">
          Shift-wise Personnel Deployed
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Date</Label>
          <Input
            type="date"
            className="h-8 w-40"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data?.shifts.map((group) => {
              const totalHeadcount = group.allocations.reduce((sum, a) => sum + a.headcount, 0);
              return (
                <div key={group.shiftType} className="rounded-md border border-border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{group.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {SHIFT_SCHEDULE[group.shiftType].hours}
                      </p>
                    </div>
                    <Badge variant="secondary">{totalHeadcount} deployed</Badge>
                  </div>

                  {group.allocations.length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">No allocation.</p>
                  ) : (
                    <div className="mt-2 flex flex-col gap-2">
                      {group.allocations.map((allocation) => (
                        <div key={allocation.id} className="rounded bg-muted/50 p-2">
                          <p className="text-xs font-medium text-foreground">
                            {allocation.districtPanel} — {allocation.shiftInCharge.name}
                          </p>
                          <ul className="mt-1 flex flex-col gap-1">
                            {allocation.assignments.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                              >
                                <span className="truncate">
                                  {a.employee.name}
                                  {a.authorizedWork ? ` — ${a.authorizedWork}` : ""}
                                </span>
                                <span className="flex shrink-0 gap-1">
                                  <ExpiryStatusBadge status={a.employee.pmeStatus} />
                                  <ExpiryStatusBadge status={a.employee.vtcStatus} />
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
