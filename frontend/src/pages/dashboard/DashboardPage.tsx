import { useEffect, useState } from "react";
import { Clock, Users, CalendarCheck, HeartPulse, GraduationCap, UserX, Loader2, Pencil, Search } from "lucide-react";

import { KpiCard } from "@/components/common/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { EmployeeFormDialog } from "@/components/common/EmployeeFormDialog";
import { useComplianceEmployees, useDashboardSummary, useShiftOverview } from "@/hooks/use-dashboard";
import { useAuth } from "@/store/auth-store";
import { SHIFT_SCHEDULE } from "@/constants/shift-schedule";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import type { ComplianceType } from "@/types/shift-allocation";
import type { Employee } from "@/types/employee";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

type ComplianceStatus = "DUE_SOON" | "EXPIRED";
type ComplianceSelection = { type: ComplianceType; status: ComplianceStatus } | null;

export function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();
  const [complianceSelection, setComplianceSelection] = useState<ComplianceSelection>(null);

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
          label="PME Due Soon"
          value={isSummaryLoading ? "…" : (summary?.pmeDueSoon ?? 0)}
          icon={HeartPulse}
          tone="warning"
          hint="Periodical Medical Examination — due within 30 days"
          onClick={() => setComplianceSelection({ type: "pme", status: "DUE_SOON" })}
        />
        <KpiCard
          label="PME Expired"
          value={isSummaryLoading ? "…" : (summary?.pmeExpired ?? 0)}
          icon={GraduationCap}
          tone="danger"
          hint="Periodical Medical Examination — expired"
          onClick={() => setComplianceSelection({ type: "pme", status: "EXPIRED" })}
        />
        <KpiCard
          label="VTC Due Soon"
          value={isSummaryLoading ? "…" : (summary?.vtcDueSoon ?? 0)}
          icon={GraduationCap}
          tone="warning"
          hint="Vocational Training Certificate — due within 30 days"
          onClick={() => setComplianceSelection({ type: "vtc", status: "DUE_SOON" })}
        />
        <KpiCard
          label="VTC Expired"
          value={isSummaryLoading ? "…" : (summary?.vtcExpired ?? 0)}
          icon={GraduationCap}
          tone="danger"
          hint="Vocational Training Certificate — expired"
          onClick={() => setComplianceSelection({ type: "vtc", status: "EXPIRED" })}
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

      <CompliancePersonnelDialog selection={complianceSelection} onClose={() => setComplianceSelection(null)} />

      {(user?.role === "ADMIN" || user?.role === "SHIFT_INCHARGE") && <ShiftOverviewSection />}
    </div>
  );
}

function CompliancePersonnelDialog({
  selection,
  onClose,
}: {
  selection: ComplianceSelection;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | ComplianceStatus>(selection?.status ?? "");
  const [employmentStatus, setEmploymentStatus] = useState<"ACTIVE" | "TRANSFERRED" | "NOT_ENROLLED">("ACTIVE");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const debouncedSetSearch = useDebouncedCallback((value: string) => setSearch(value), 300);
  const type = selection?.type ?? null;
  useEffect(() => {
    setStatus(selection?.status ?? "");
  }, [selection]);
  const { data: employees, isLoading } = useComplianceEmployees(type, search, status || undefined, employmentStatus);
  const label = type === "pme"
    ? status === "EXPIRED" ? "PME Expired Personnel" : status === "DUE_SOON" ? "PME Due Soon Personnel" : "PME Due Personnel"
    : status === "EXPIRED" ? "VTC Expired Personnel" : status === "DUE_SOON" ? "VTC Due Soon Personnel" : "VTC Due Personnel";
  const statusLabel = type === "pme" ? "PME status" : "VTC status";
  return (
    <Dialog open={!!selection} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>Active employees due within 30 days or already expired, with their complete master details.</DialogDescription>
        </DialogHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            aria-label={statusLabel}
          >
            <option value="">All due statuses</option>
            <option value="DUE_SOON">Due soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
          <select
            className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={employmentStatus}
            onChange={(event) => setEmploymentStatus(event.target.value as typeof employmentStatus)}
            aria-label="Employment status"
          >
            <option value="ACTIVE">Active</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="NOT_ENROLLED">Not Enrolled</option>
          </select>
          <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, NEIS or EIS number..."
            className="pl-8"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              debouncedSetSearch(event.target.value);
            }}
          />
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
        ) : employees && employees.length > 0 ? (
          <div className="max-h-[60vh] overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted text-muted-foreground">
                <tr>
                  <th className="p-2">Employee</th><th className="p-2">Type</th><th className="p-2">Employment status</th><th className="p-2">Designation / Grade</th><th className="p-2">Department / Skill</th><th className="p-2">DOB</th><th className="p-2">DOA</th><th className="p-2">PME</th><th className="p-2">VTC</th><th className="p-2">Relay</th><th className="p-2">Medical / Remarks</th>{canEdit && <th className="p-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => <ComplianceRow key={employee.id} employee={employee} canEdit={canEdit} onEdit={setEditingEmployee} />)}
              </tbody>
            </table>
          </div>
        ) : <p className="py-10 text-center text-sm text-muted-foreground">No personnel currently due.</p>}
      </DialogContent>
      <EmployeeFormDialog
        open={!!editingEmployee}
        onOpenChange={(open) => !open && setEditingEmployee(null)}
        employee={editingEmployee}
      />
    </Dialog>
  );
}

function ComplianceRow({ employee, canEdit, onEdit }: { employee: Employee; canEdit: boolean; onEdit: (employee: Employee) => void }) {
  const format = (value: string | null) => value ? new Date(value).toLocaleDateString() : "—";
  return <tr className="border-t border-border align-top"><td className="p-2"><div className="font-medium text-foreground">{employee.name}</div><div className="text-muted-foreground">{employee.employeeId}</div><div className="text-muted-foreground">Father: {employee.fatherName ?? "—"}</div></td><td className="p-2">{employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : employee.employeeType === "EXECUTIVE" ? "Executive" : "Staff"}</td><td className="p-2">{employee.employmentStatus === "TRANSFERRED" ? "Transferred" : employee.employmentStatus === "NOT_ENROLLED" ? "Not Enrolled" : "Active"}</td><td className="p-2">{employee.designation}<br /><span className="text-muted-foreground">Grade: {employee.grade ?? "—"}</span></td><td className="p-2">{employee.department}<br /><span className="text-muted-foreground">Skill: {employee.skill}</span></td><td className="p-2">{format(employee.dateOfBirth)}</td><td className="p-2">{format(employee.dateOfJoining)}</td><td className="p-2"><ExpiryStatusBadge status={employee.pmeStatus} /><br />Date: {format(employee.pmeDate)}<br />Due: {format(employee.pmeExpiry)}<br /><span className="font-medium">Left: {employee.pmeDaysLeft ?? "—"} days</span></td><td className="p-2">{employee.employeeType === "MONTHLY_RATED" ? "Not required" : <><ExpiryStatusBadge status={employee.vtcStatus} /><br />Due: {format(employee.vtcExpiry)}<br />Left: {employee.vtcDaysLeft ?? "—"} days</>}</td><td className="p-2">{employee.relay.replace("RELAY_", "Relay ")}</td><td className="p-2">Medical: {employee.medicalConditions ?? "—"}<br />Remark: {employee.remark ?? "—"}</td>{canEdit && <td className="p-2"><Button variant="ghost" size="icon" onClick={() => onEdit(employee)} aria-label={`Edit ${employee.name}`}><Pencil className="size-4" /></Button></td>}</tr>;
}

function ComplianceChart({
  summary,
  loading,
}: {
  summary: { totalEmployees: number; allocatedEmployees: number; pmeDueSoon: number; pmeExpired: number; vtcDueSoon: number; vtcExpired: number } | undefined;
  loading: boolean;
}) {
  const values = [
    { label: "Allocated", value: summary?.allocatedEmployees ?? 0, color: "bg-success" },
    { label: "PME soon", value: summary?.pmeDueSoon ?? 0, color: "bg-warning" },
    { label: "PME expired", value: summary?.pmeExpired ?? 0, color: "bg-danger" },
    { label: "VTC soon", value: summary?.vtcDueSoon ?? 0, color: "bg-warning" },
    { label: "VTC expired", value: summary?.vtcExpired ?? 0, color: "bg-danger" },
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
