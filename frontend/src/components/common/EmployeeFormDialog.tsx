import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

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
import { useCreateEmployee, useUpdateEmployee } from "@/hooks/use-employees";
import type { Employee } from "@/types/employee";

const employeeFormSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  experienceYrs: z.coerce.number().min(0, "Can't be negative"),
  designation: z.string().trim().min(1, "Designation is required"),
  grade: z.string().optional(),
  department: z.string().trim().min(1, "Department is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  pmeDate: z.string().optional(),
  vtcDate: z.string().optional(),
  leaveStart: z.string().optional(),
  leaveEnd: z.string().optional(),
  rejoiningDate: z.string().optional(),
  relay: z.enum(["Relay A", "Relay B", "Relay C"]),
  employeeType: z.enum(["DAILY_RATED", "MONTHLY_RATED", "STAFF"]),
});

type EmployeeFormInput = z.input<typeof employeeFormSchema>;
type EmployeeFormValues = z.output<typeof employeeFormSchema>;

const RELAY_DISPLAY_VALUES = ["Relay A", "Relay B", "Relay C"] as const;

type RelayDisplayValue = (typeof RELAY_DISPLAY_VALUES)[number];

function relayInternalToDisplay(value: string | undefined): RelayDisplayValue {
  switch (value) {
    case "RELAY_A":
      return "Relay A";
    case "RELAY_B":
      return "Relay B";
    case "RELAY_C":
      return "Relay C";
    default:
      return "Relay A";
  }
}

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this employee instead of creating a new one. */
  employee?: Employee | null;
  initialEmployeeType?: "DAILY_RATED" | "MONTHLY_RATED" | "STAFF";
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD" for <input type="date">
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
  initialEmployeeType = "DAILY_RATED",
}: EmployeeFormDialogProps) {
  const isEditing = !!employee;
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { experienceYrs: 0 },
  });
  const selectedEmployeeType = useWatch({ control, name: "employeeType" });

  // Reset the form whenever a different employee is opened for editing,
  // or the dialog re-opens for a new entry.
  useEffect(() => {
    if (!open) return;
    if (employee) {
      reset({
        employeeId: employee.employeeId,
        name: employee.name,
        dateOfBirth: toDateInputValue(employee.dateOfBirth),
        experienceYrs: employee.experienceYrs,
        designation: employee.designation,
        grade: employee.grade ?? "",
        department: employee.department,
        skill: employee.skill,
        dateOfJoining: toDateInputValue(employee.dateOfJoining),
        pmeDate: toDateInputValue(employee.pmeDate),
        vtcDate: toDateInputValue(employee.vtcDate),
        leaveStart: toDateInputValue(employee.leaveStart),
        leaveEnd: toDateInputValue(employee.leaveEnd),
        rejoiningDate: toDateInputValue(employee.rejoiningDate),
        relay: relayInternalToDisplay(employee.relay),
        employeeType: employee.employeeType,
      });
    } else {
      reset({
        employeeId: "",
        name: "",
        dateOfBirth: "",
        experienceYrs: 0,
        designation: "",
        grade: "",
        department: "",
        skill: "",
        dateOfJoining: "",
        pmeDate: "",
        vtcDate: "",
        leaveStart: "",
        leaveEnd: "",
        rejoiningDate: "",
        relay: "Relay A",
        employeeType: initialEmployeeType,
      });
    }
  }, [open, employee, reset]);

  const onSubmit = async (values: EmployeeFormValues) => {
    const payload = {
      ...values,
      pmeDate: values.pmeDate || null,
      vtcDate: values.vtcDate || null,
      leaveStart: values.leaveStart || null,
      leaveEnd: values.leaveEnd || null,
      rejoiningDate: values.rejoiningDate || null,
      isActive: true,
      employeeType: values.employeeType,
    };

    if (isEditing && employee) {
      await updateEmployee.mutateAsync({ id: employee.id, payload });
    } else {
      await createEmployee.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Employee" : "Add Employee"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this employee's record."
              : "Add a new employee to the roster."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Employee ID" error={errors.employeeId?.message}>
              <Input {...register("employeeId")} disabled={isEditing} />
            </Field>
            <Field label="Employee group" error={errors.employeeType?.message}>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("employeeType")}
              >
                <option value="DAILY_RATED">Daily Rated Worker</option>
                <option value="STAFF">Staff</option>
              </select>
            </Field>
            <Field label="Name" error={errors.name?.message}>
              <Input {...register("name")} />
            </Field>
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input type="date" {...register("dateOfBirth")} />
            </Field>
            <Field label="Experience (years)" error={errors.experienceYrs?.message}>
              <Input type="number" step="0.5" min="0" {...register("experienceYrs")} />
            </Field>
            <Field label="Designation" error={errors.designation?.message}>
              <Input list="staff-designations" {...register("designation")} />
              <datalist id="staff-designations">
                <option value="Mining Overman" />
                <option value="Sirdar" />
                <option value="Electrical Foreman" />
                <option value="Mechanical Foremen" />
                <option value="Executive: Shift Incharge" />
              </datalist>
            </Field>
            <Field label="Department" error={errors.department?.message}>
              <Input {...register("department")} />
            </Field>
            <Field label="Grade" error={errors.grade?.message}>
              <Input {...register("grade")} placeholder="Optional grade" />
            </Field>
            <Field label="Skill" error={errors.skill?.message}>
              <Input {...register("skill")} />
            </Field>
            <Field label="Relay" error={errors.relay?.message}>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("relay")}
              >
                <option value="Relay A">Relay A</option>
                <option value="Relay B">Relay B</option>
                <option value="Relay C">Relay C</option>
              </select>
            </Field>
            <Field label="Date of Joining" error={errors.dateOfJoining?.message}>
              <Input type="date" {...register("dateOfJoining")} />
            </Field>
            <Field label="PME Date" error={errors.pmeDate?.message}>
              <Input type="date" {...register("pmeDate")} />
            </Field>
            {selectedEmployeeType === "DAILY_RATED" && (
              <>
                <Field label="VTC Date" error={errors.vtcDate?.message}>
                  <Input type="date" {...register("vtcDate")} />
                </Field>
                <Field label="Leave Start" error={errors.leaveStart?.message}>
                  <Input type="date" {...register("leaveStart")} />
                </Field>
                <Field label="Leave End" error={errors.leaveEnd?.message}>
                  <Input type="date" {...register("leaveEnd")} />
                </Field>
                <Field label="Rejoining Date" error={errors.rejoiningDate?.message}>
                  <Input type="date" {...register("rejoiningDate")} />
                </Field>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="size-4 animate-spin" />}
              {isEditing ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
