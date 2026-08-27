import { useState } from "react";
import { Plus, Loader2, Pencil, Users, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { ShiftAllocationFormDialog } from "@/components/common/ShiftAllocationFormDialog";
import { useShiftOverview } from "@/hooks/use-dashboard";
import { useDeleteShiftAllocation } from "@/hooks/use-shift-allocations";
import { useAuth } from "@/store/auth-store";
import { SHIFT_SCHEDULE, type ShiftTypeValue } from "@/constants/shift-schedule";
import type { ShiftAllocation } from "@/types/shift-allocation";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function ShiftAllocationPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN" || user?.role === "SHIFT_INCHARGE";

  const [date, setDate] = useState(todayISO());
  const [formOpen, setFormOpen] = useState(false);
  const [editingAllocation, setEditingAllocation] = useState<ShiftAllocation | null>(null);
  const [prefillShiftType, setPrefillShiftType] = useState<ShiftTypeValue | undefined>();

  const { data, isLoading } = useShiftOverview(date);
  const deleteAllocation = useDeleteShiftAllocation();

  const handleDelete = (allocation: ShiftAllocation) => {
    if (window.confirm(`Delete the ${allocation.shiftLabel} roster for ${allocation.date}?`)) {
      deleteAllocation.mutate(allocation.id);
    }
  };

  const openNewFor = (shiftType?: ShiftTypeValue) => {
    setEditingAllocation(null);
    setPrefillShiftType(shiftType);
    setFormOpen(true);
  };

  const openEdit = (allocation: ShiftAllocation) => {
    setEditingAllocation(allocation);
    setPrefillShiftType(undefined);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <Label>Date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
        </div>
        {canEdit && (
          <Button onClick={() => openNewFor()}>
            <Plus className="size-4" />
            New Allocation
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data?.shifts.map((group) => (
            <Card key={group.shiftType}>
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    {group.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {SHIFT_SCHEDULE[group.shiftType].hours}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNewFor(group.shiftType)}
                  >
                    <Plus className="size-3.5" />
                    Add Panel
                  </Button>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {group.allocations.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    No allocation for this shift yet.
                  </p>
                ) : (
                  group.allocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {allocation.districtPanel === "Shift Roster" ? "Shift Roster" : allocation.districtPanel}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            In-Charge: {allocation.shiftInCharge.name} (
                            {allocation.shiftInCharge.employeeId})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary">
                            <Users className="size-3" />
                            {allocation.headcount}
                          </Badge>
                          {canEdit && (
                            <>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => openEdit(allocation)} aria-label="Edit roster">
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="size-7" onClick={() => handleDelete(allocation)} disabled={deleteAllocation.isPending} aria-label="Delete roster">
                                <Trash2 className="size-3.5 text-danger" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {allocation.assignments.length > 0 && (
                        <ul className="mt-2 flex flex-col gap-1.5 border-t border-border pt-2">
                          {allocation.assignments.map((a) => (
                            <li
                              key={a.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="min-w-0 truncate text-foreground">
                                {a.employee.name}
                                {a.authorizedWork && (
                                  <span className="text-muted-foreground"> — {a.authorizedWork}</span>
                                )}
                              </span>
                              <span className="hidden text-[11px] text-muted-foreground xl:inline">
                                PME {displayDate(a.employee.pmeDate)} → {displayDate(a.employee.pmeExpiry)} ({a.employee.pmeDaysLeft ?? "—"}d) · VTC {displayDate(a.employee.vtcDate)} → {displayDate(a.employee.vtcExpiry)} ({a.employee.vtcDaysLeft ?? "—"}d)
                              </span>
                              <span className="flex shrink-0 gap-1">
                                <ExpiryStatusBadge status={a.employee.pmeStatus} />
                                <ExpiryStatusBadge status={a.employee.vtcStatus} />
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canEdit && (
        <ShiftAllocationFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          existing={editingAllocation}
          defaultDate={date}
          defaultShiftType={prefillShiftType}
        />
      )}
    </div>
  );
}
