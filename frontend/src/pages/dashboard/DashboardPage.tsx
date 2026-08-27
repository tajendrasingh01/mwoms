import { useState } from "react";
import { Clock, Users, CalendarCheck, HeartPulse, GraduationCap, UserX, Loader2 } from "lucide-react";

import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { useComplianceEmployees, useDashboardSummary, useShiftOverview } from "@/hooks/use-dashboard";
import { useAuth } from "@/store/auth-store";
import { SHIFT_SCHEDULE } from "@/constants/shift-schedule";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ComplianceType } from "@/types/shift-allocation";
import type { Employee } from "@/types/employee";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const [complianceType, setComplianceType] = useState<ComplianceType | null>(null);

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
          onClick={() => setComplianceType("pme")}
        />
        <KpiCard
          label="VTC Due"
          value={isSummaryLoading ? "…" : (summary?.vtcDue ?? 0)}
          icon={GraduationCap}
          tone="warning"
          hint="Vocational Training Certificate — due soon or expired"
          onClick={() => setComplianceType("vtc")}
        />
        <KpiCard
          label="Vacant Positions"
          value={isSummaryLoading ? "…" : (summary?.vacantPositions ?? 0)}
          icon={UserX}
          tone="danger"
          hint="Not yet tracked — no staffing plan configured"
        />
      </div>

      <ComplianceChart summary={summary} loading={isSummaryLoading} />

      <CompliancePersonnelDialog type={complianceType} onClose={() => setComplianceType(null)} />

      {(user?.role === "ADMIN" || user?.role === "SHIFT_INCHARGE") && <ShiftOverviewSection />}
    </div>
  );
}

function CompliancePersonnelDialog({
  type,
  onClose,
}: {
  type: ComplianceType | null;
  onClose: () => void;
}) {
  const { data: employees, isLoading } = useComplianceEmployees(type);
  const label = type === "pme" ? "PME Due Personnel" : "VTC Due Personnel";
  return (
    <Dialog open={!!type} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Active employees due within 30 days or already expired, with their complete master details.</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : employees && employees.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-2">Employee</th><th className="p-2">Type</th><th className="p-2">Designation / Grade</th><th className="p-2">Department / Skill</th><th className="p-2">DOB</th><th className="p-2">DOA</th><th className="p-2">PME</th><th className="p-2">VTC</th><th className="p-2">Relay</th><th className="p-2">Medical / Remarks</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => <ComplianceRow key={employee.id} employee={employee} />)}
              </tbody>
            </table>
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">No personnel currently due.</p>}
      </DialogContent>
    </Dialog>
  );
}

function ComplianceRow({ employee }: { employee: Employee }) {
  const format = (value: string | null) => value ? new Date(value).toLocaleDateString() : "—";
  return <tr className="border-t border-border align-top"><td className="p-2"><div className="font-medium text-foreground">{employee.name}</div><div className="text-muted-foreground">{employee.employeeId}</div><div className="text-muted-foreground">Father: {employee.fatherName ?? "—"}</div></td><td className="p-2">{employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : "Staff"}</td><td className="p-2">{employee.designation}<br /><span className="text-muted-foreground">Grade: {employee.grade ?? "—"}</span></td><td className="p-2">{employee.department}<br /><span className="text-muted-foreground">Skill: {employee.skill}</span></td><td className="p-2">{format(employee.dateOfBirth)}</td><td className="p-2">{format(employee.dateOfJoining)}</td><td className="p-2"><ExpiryStatusBadge status={employee.pmeStatus} /><br />Date: {format(employee.pmeDate)}<br />Due: {format(employee.pmeExpiry)}<br /><span className="font-medium">Left: {employee.pmeDaysLeft ?? "—"} days</span></td><td className="p-2">{employee.employeeType === "MONTHLY_RATED" ? "Not required" : <><ExpiryStatusBadge status={employee.vtcStatus} /><br />Due: {format(employee.vtcExpiry)}<br />Left: {employee.vtcDaysLeft ?? "—"} days</>}</td><td className="p-2">{employee.relay.replace("RELAY_", "Relay ")}</td></tr>;
  return <tr className="border-t border-border align-top"><td className="p-2"><div className="font-medium text-foreground">{employee.name}</div><div className="text-muted-foreground">{employee.employeeId}</div><div className="text-muted-foreground">Father: {employee.fatherName ?? "—"}</div></td><td className="p-2">{employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : "Staff"}</td><td className="p-2">{employee.designation}<br /><span className="text-muted-foreground">Grade: {employee.grade ?? "—"}</span></td><td className="p-2">{employee.department}<br /><span className="text-muted-foreground">Skill: {employee.skill}</span></td><td className="p-2">{format(employee.dateOfBirth)}</td><td className="p-2">{format(employee.dateOfJoining)}</td><td className="p-2"><ExpiryStatusBadge status={employee.pmeStatus} /><br />Date: {format(employee.pmeDate)}<br />Due: {format(employee.pmeExpiry)}<br /><span className="font-medium">Left: {employee.pmeDaysLeft ?? "—"} days</span></td><td className="p-2">{employee.employeeType === "MONTHLY_RATED" ? "Not required" : <><ExpiryStatusBadge status={employee.vtcStatus} /><br />Due: {format(employee.vtcExpiry)}<br />Left: {employee.vtcDaysLeft ?? "—"} days</>}</td><td className="p-2">{employee.relay.replace("RELAY_", "Relay ")}</td><td className="p-2">Medical: {employee.medicalConditions ?? "—"}<br />Remark: {employee.remark ?? "—"}</td></tr>;
}

function ComplianceChart({
  summary,
  loading,
}: {
  summary: { totalEmployees: number; allocatedEmployees: number; pmeDue: number; vtcDue: number } | undefined;
  loading: boolean;
}) {
  const values = [
    { label: "Allocated", value: summary?.allocatedEmployees ?? 0, color: "bg-success" },
    { label: "PME due", value: summary?.pmeDue ?? 0, color: "bg-warning" },
    { label: "VTC due", value: summary?.vtcDue ?? 0, color: "bg-danger" },
  ];
  const max = Math.max(summary?.totalEmployees ?? 1, 1);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base font-semibold text-foreground">Workforce Snapshot</CardTitle></CardHeader>
      <CardContent>
        {loading ? <div className="h-28 animate-pulse rounded bg-muted" /> : (
          <div className="flex h-32 items-end gap-6 border-b border-l border-border px-4 pb-0 pt-4">
            {values.map((item) => (
              <div key={item.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-medium text-foreground">{item.value}</span>
                <div className={`w-full max-w-20 rounded-t ${item.color}`} style={{ height: `${Math.max((item.value / max) * 100, item.value ? 8 : 2)}%` }} />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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
