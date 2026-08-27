import { useState } from "react";
import { Loader2, X, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { EmployeeSearchPicker } from "@/components/common/EmployeeSearchPicker";
import { useSaveShiftAllocation } from "@/hooks/use-shift-allocations";
import { useShiftInChargeUsers } from "@/hooks/use-shift-incharge-users";
import { SHIFT_TYPES, SHIFT_SCHEDULE, type ShiftTypeValue } from "@/constants/shift-schedule";
import type { Employee } from "@/types/employee";
import type { ShiftAllocation } from "@/types/shift-allocation";

interface AssignedEmployee {
  employee: Employee;
  authorizedWork: string;
}

interface ShiftAllocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-fills the form for editing; defaults come from these when set. */
  existing?: ShiftAllocation | null;
  /** Pre-fills date/shiftType when creating fresh from a specific cell. */
  defaultDate?: string;
  defaultShiftType?: ShiftTypeValue;
}

export function ShiftAllocationFormDialog({
  open,
  onOpenChange,
  existing,
  defaultDate,
  defaultShiftType,
}: ShiftAllocationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {/* Keying on the target forces a full remount (fresh initial
            state) each time a different allocation is opened, instead
            of syncing state via an effect. Only rendered while open,
            so state never lingers from a previous session. */}
        {open && (
          <ShiftAllocationForm
            key={existing?.id ?? `new-${defaultDate ?? ""}-${defaultShiftType ?? ""}`}
            existing={existing}
            defaultDate={defaultDate}
            defaultShiftType={defaultShiftType}
            onOpenChange={onOpenChange}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ShiftAllocationFormProps {
  existing?: ShiftAllocation | null;
  defaultDate?: string;
  defaultShiftType?: ShiftTypeValue;
  onOpenChange: (open: boolean) => void;
}

function ShiftAllocationForm({
  existing,
  defaultDate,
  defaultShiftType,
  onOpenChange,
}: ShiftAllocationFormProps) {
  const isEditing = !!existing;
  const saveAllocation = useSaveShiftAllocation();
  const { data: shiftInChargeUsers } = useShiftInChargeUsers();

  const [date, setDate] = useState(
    existing?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
  );
  const [shiftType, setShiftType] = useState<ShiftTypeValue>(
    existing?.shiftType ?? defaultShiftType ?? "GENERAL",
  );
  const [districtPanel, setDistrictPanel] = useState(existing?.districtPanel ?? "");
  const [shiftInChargeId, setShiftInChargeId] = useState(existing?.shiftInCharge.id ?? "");
  const [assigned, setAssigned] = useState<AssignedEmployee[]>(
    existing?.assignments.map((a) => ({
      employee: a.employee,
      authorizedWork: a.authorizedWork ?? "",
    })) ?? [],
  );
  const [formError, setFormError] = useState<string | null>(null);

  const excludeIds = new Set(assigned.map((a) => a.employee.id));

  const expiredCount = assigned.filter(
    (a) => a.employee.pmeStatus === "EXPIRED" || a.employee.vtcStatus === "EXPIRED",
  ).length;
  const dueSoonCount = assigned.filter(
    (a) => a.employee.pmeStatus === "DUE_SOON" || a.employee.vtcStatus === "DUE_SOON",
  ).length;

  const handleAdd = (employee: Employee) => {
    setAssigned((prev) => [...prev, { employee, authorizedWork: "" }]);
  };

  const handleRemove = (employeeId: string) => {
    setAssigned((prev) => prev.filter((a) => a.employee.id !== employeeId));
  };

  const handleAuthorizedWorkChange = (employeeId: string, value: string) => {
    setAssigned((prev) =>
      prev.map((a) => (a.employee.id === employeeId ? { ...a, authorizedWork: value } : a)),
    );
  };

  const handleSave = async () => {
    setFormError(null);
    if (!date || !shiftInChargeId) {
      setFormError("Date and Shift In-Charge are required.");
      return;
    }
    try {
      await saveAllocation.mutateAsync({
        date,
        shiftType,
        districtPanel: districtPanel.trim() || "Shift Roster",
        shiftInChargeId,
        assignments: assigned.map((a) => ({
          employeeId: a.employee.id,
          authorizedWork: a.authorizedWork.trim() || undefined,
        })),
      });
      onOpenChange(false);
    } catch {
      setFormError("Failed to save allocation. Please check the details and try again.");
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditing ? "Edit Shift Allocation" : "New Shift Allocation"}</DialogTitle>
        <DialogDescription>
          Create one roster for the shift. The Shift In-Charge is responsible for all assigned workers; add a location only when needed.
        </DialogDescription>
      </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Shift</Label>
              <Select value={shiftType} onValueChange={(v) => setShiftType(v as ShiftTypeValue)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHIFT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {SHIFT_SCHEDULE[type].label} ({SHIFT_SCHEDULE[type].hours})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Location (optional)</Label>
              <Input
                placeholder="Optional work location"
                value={districtPanel}
                onChange={(e) => setDistrictPanel(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Shift In-Charge</Label>
              <Select value={shiftInChargeId} onValueChange={setShiftInChargeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {(shiftInChargeUsers ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} ({u.employeeId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Assign Employees</Label>
            <EmployeeSearchPicker excludeIds={excludeIds} onAdd={handleAdd} />
          </div>

          {(expiredCount > 0 || dueSoonCount > 0) && (
            <div className="flex items-start gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {expiredCount > 0 && `${expiredCount} assigned employee(s) have expired PME/VTC. `}
                {dueSoonCount > 0 && `${dueSoonCount} assigned employee(s) have PME/VTC due soon.`}
              </span>
            </div>
          )}

          {assigned.length > 0 && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-2">
              {assigned.map((a) => (
                <div
                  key={a.employee.id}
                  className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {a.employee.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({a.employee.employeeId})
                      </span>
                    </p>
                    <div className="mt-0.5 flex gap-1">
                      <ExpiryStatusBadge status={a.employee.pmeStatus} />
                      <ExpiryStatusBadge status={a.employee.vtcStatus} />
                    </div>
                  </div>
                  <Input
                    list="common-works"
                    placeholder="Work (type or select)"
                    className="h-8 w-48"
                    value={a.authorizedWork}
                    onChange={(e) => handleAuthorizedWorkChange(a.employee.id, e.target.value)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0"
                    onClick={() => handleRemove(a.employee.id)}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
              ))}
              <datalist id="common-works">
                <option value="Mining" />
                <option value="Drilling" />
                <option value="Blasting" />
                <option value="Electrical Maintenance" />
                <option value="Mechanical Maintenance" />
                <option value="Haulage" />
                <option value="Safety Inspection" />
              </datalist>
            </div>
          )}

          {formError && <p className="text-xs text-danger">{formError}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveAllocation.isPending}>
            {saveAllocation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save Allocation
          </Button>
        </DialogFooter>
    </>
  );
}
