import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
  department: z.string().trim().min(1, "Department is required"),
  skill: z.string().trim().min(1, "Skill is required"),
  dateOfJoining: z.string().min(1, "Date of joining is required"),
  pmeExpiry: z.string().optional(),
  vtcExpiry: z.string().optional(),
});

type EmployeeFormInput = z.input<typeof employeeFormSchema>;
type EmployeeFormValues = z.output<typeof employeeFormSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this employee instead of creating a new one. */
  employee?: Employee | null;
}

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10); // "YYYY-MM-DD" for <input type="date">
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const isEditing = !!employee;
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const isSaving = createEmployee.isPending || updateEmployee.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmployeeFormInput, unknown, EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: { experienceYrs: 0 },
  });

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
        department: employee.department,
        skill: employee.skill,
        dateOfJoining: toDateInputValue(employee.dateOfJoining),
        pmeExpiry: toDateInputValue(employee.pmeExpiry),
        vtcExpiry: toDateInputValue(employee.vtcExpiry),
      });
    } else {
      reset({
        employeeId: "",
        name: "",
        dateOfBirth: "",
        experienceYrs: 0,
        designation: "",
        department: "",
        skill: "",
        dateOfJoining: "",
        pmeExpiry: "",
        vtcExpiry: "",
      });
    }
  }, [open, employee, reset]);

  const onSubmit = async (values: EmployeeFormValues) => {
    const payload = {
      ...values,
      pmeExpiry: values.pmeExpiry || null,
      vtcExpiry: values.vtcExpiry || null,
      isActive: true,
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
              <Input {...register("designation")} />
            </Field>
            <Field label="Department" error={errors.department?.message}>
              <Input {...register("department")} />
            </Field>
            <Field label="Skill" error={errors.skill?.message}>
              <Input {...register("skill")} />
            </Field>
            <Field label="Date of Joining" error={errors.dateOfJoining?.message}>
              <Input type="date" {...register("dateOfJoining")} />
            </Field>
            <Field label="PME Expiry" error={errors.pmeExpiry?.message}>
              <Input type="date" {...register("pmeExpiry")} />
            </Field>
            <Field label="VTC Expiry" error={errors.vtcExpiry?.message}>
              <Input type="date" {...register("vtcExpiry")} />
            </Field>
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
