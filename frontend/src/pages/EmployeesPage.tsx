import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Search, Plus, Pencil, UserX, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { EmployeeFormDialog } from "@/components/common/EmployeeFormDialog";
import { useEmployees, useDeactivateEmployee } from "@/hooks/use-employees";
import { useAuth } from "@/store/auth-store";
import type { Employee } from "@/types/employee";

export function EmployeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const { data, isLoading, isFetching } = useEmployees({ search, page, pageSize: 25 });
  const deactivateEmployee = useDeactivateEmployee();

  const openAddDialog = () => {
    setEditingEmployee(null);
    setFormOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormOpen(true);
  };

  const handleDeactivate = (employee: Employee) => {
    if (window.confirm(`Deactivate ${employee.name} (${employee.employeeId})?`)) {
      deactivateEmployee.mutate(employee.id);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or Employee ID..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetSearch(e.target.value);
            }}
          />
        </div>
        {canEdit && (
          <Button onClick={openAddDialog}>
            <Plus className="size-4" />
            Add Employee
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : data && data.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>PME</TableHead>
                  <TableHead>VTC</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employeeId}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.age}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.experienceYrs} yrs</TableCell>
                    <TableCell>
                      <ExpiryStatusBadge status={employee.pmeStatus} />
                    </TableCell>
                    <TableCell>
                      <ExpiryStatusBadge status={employee.vtcStatus} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={employee.isActive ? "success" : "secondary"}>
                        {employee.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(employee)}
                            aria-label={`Edit ${employee.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {employee.isActive && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeactivate(employee)}
                              aria-label={`Deactivate ${employee.name}`}
                            >
                              <UserX className="size-4 text-danger" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {search ? "No employees match your search." : "No employees yet."}
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} —{" "}
            {data.pagination.total} employees
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {canEdit && (
        <EmployeeFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          employee={editingEmployee}
        />
      )}
    </div>
  );
}
