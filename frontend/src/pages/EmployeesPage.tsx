import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Search, Plus, Pencil, UserX, Loader2, FileUp, Download } from "lucide-react";
import * as XLSX from "xlsx";

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
import { EmployeeImportDialog } from "@/components/common/EmployeeImportDialog";
import { useEmployees, useDeactivateEmployee } from "@/hooks/use-employees";
import { listAllEmployeesRequest } from "@/services/employee.service";
import { useAuth } from "@/store/auth-store";
import type { Employee } from "@/types/employee";

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function EmployeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [employeeType, setEmployeeType] = useState<"" | "DAILY_RATED" | "STAFF">("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [relay, setRelay] = useState<"" | "RELAY_A" | "RELAY_B" | "RELAY_C">("");
  const [pmeStatus, setPmeStatus] = useState<"" | "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET">("");
  const [vtcStatus, setVtcStatus] = useState<"" | "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET">("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [isExporting, setIsExporting] = useState(false);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const { data, isLoading, isFetching } = useEmployees({
    search,
    employeeType: employeeType || undefined,
    designation: designation || undefined,
    department: department || undefined,
    relay: relay || undefined,
    pmeStatus: pmeStatus || undefined,
    vtcStatus: vtcStatus || undefined,
    isActive: activeFilter ? activeFilter === "true" : undefined,
    page,
    pageSize: 25,
  });
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const employees = await listAllEmployeesRequest({
        search: search || undefined,
        employeeType: employeeType || undefined,
        designation: designation || undefined,
        department: department || undefined,
        relay: relay || undefined,
        pmeStatus: pmeStatus || undefined,
        vtcStatus: vtcStatus || undefined,
        isActive: activeFilter ? activeFilter === "true" : undefined,
      });

      const rows = employees.map((employee) => ({
        "Employee ID": employee.employeeId,
        Name: employee.name,
        "Father Name": employee.fatherName ?? "",
        "Employee Type": employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : "Staff",
        "Date of Birth": displayDate(employee.dateOfBirth),
        Age: employee.age,
        Designation: employee.designation,
        Grade: employee.grade ?? "",
        Department: employee.department,
        Skill: employee.skill,
        "Date of Joining": displayDate(employee.dateOfJoining),
        "Experience (Years)": employee.experienceYrs,
        Relay: employee.relay.replace("RELAY_", "Relay "),
        "PME Date": displayDate(employee.pmeDate),
        "PME Due": displayDate(employee.pmeExpiry),
        "PME Days Left": employee.pmeDaysLeft ?? "",
        "PME Status": employee.pmeStatus,
        "VTC Date": displayDate(employee.vtcDate),
        "VTC Due": displayDate(employee.vtcExpiry),
        "VTC Days Left": employee.vtcDaysLeft ?? "",
        "VTC Status": employee.vtcStatus,
        "Medical Conditions": employee.medicalConditions ?? "",
        Remark: employee.remark ?? "",
        Status: employee.isActive ? "Active" : "Inactive",
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = Object.keys(rows[0] ?? {}).map((header) => ({
        wch: Math.min(Math.max(header.length + 2, 12), 24),
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Master");
      XLSX.writeFile(workbook, `employee-master-${new Date().toISOString().slice(0, 10)}.xlsx`);
    } finally {
      setIsExporting(false);
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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
            {isExporting ? "Exporting..." : "Export Excel"}
          </Button>
          {canEdit && (
            <>
              <Button onClick={openAddDialog}>
                <Plus className="size-4" />
                Add Employee
              </Button>
              <Button variant="outline" onClick={() => setStaffFormOpen(true)}>
                <Plus className="size-4" />
                Add Staff
              </Button>
              <Button variant="secondary" onClick={() => setImportOpen(true)}>
                <FileUp className="size-4" />
                Import
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-7">
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={employeeType} onChange={(e) => { setEmployeeType(e.target.value as typeof employeeType); setPage(1); }}>
          <option value="">All groups</option>
          <option value="DAILY_RATED">DR - Daily Rated</option>
          <option value="MONTHLY_RATED">MR - Monthly Rated</option>
          <option value="STAFF">Staff</option>
        </select>
        <Input placeholder="Filter designation" value={designation} onChange={(e) => { setDesignation(e.target.value); setPage(1); }} />
        <Input placeholder="Filter department" value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }} />
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={relay} onChange={(e) => { setRelay(e.target.value as typeof relay); setPage(1); }}>
          <option value="">All relays</option>
          <option value="RELAY_A">Relay A</option>
          <option value="RELAY_B">Relay B</option>
          <option value="RELAY_C">Relay C</option>
        </select>
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={pmeStatus} onChange={(e) => { setPmeStatus(e.target.value as typeof pmeStatus); setPage(1); }}>
          <option value="">All PME statuses</option>
          <option value="EXPIRED">PME expired</option>
          <option value="DUE_SOON">PME near expiry</option>
          <option value="VALID">PME valid</option>
          <option value="NOT_SET">PME not set</option>
        </select>
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={vtcStatus} onChange={(e) => { setVtcStatus(e.target.value as typeof vtcStatus); setPage(1); }}>
          <option value="">All VTC statuses</option>
          <option value="EXPIRED">VTC expired</option>
          <option value="DUE_SOON">VTC near expiry</option>
          <option value="VALID">VTC valid</option>
          <option value="NOT_SET">VTC not set</option>
        </select>
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={activeFilter} onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(1); }}>
          <option value="">All statuses</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Grade / Department</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>PME Date / Due / Left</TableHead>
                  <TableHead>VTC Date / Due / Left</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.employeeId}</TableCell>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.age}</TableCell>
                    <TableCell>{employee.designation}</TableCell>
                    <TableCell>{employee.grade ? `${employee.grade} / ` : ""}{employee.department}</TableCell>
                    <TableCell>{employee.experienceYrs} yrs</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <ExpiryStatusBadge status={employee.pmeStatus} />
                        <div className="mt-1 text-muted-foreground">Date: {displayDate(employee.pmeDate)}</div>
                        <div className="text-muted-foreground">Due: {displayDate(employee.pmeExpiry)}</div>
                        <div className={employee.pmeDaysLeft !== null && employee.pmeDaysLeft < 0 ? "text-danger" : "text-muted-foreground"}>
                          Left: {employee.pmeDaysLeft === null ? "—" : `${employee.pmeDaysLeft} days`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.employeeType === "MONTHLY_RATED" ? (
                        <span className="text-xs text-muted-foreground">Not required for MR</span>
                      ) : <div className="text-xs">
                        <ExpiryStatusBadge status={employee.vtcStatus} />
                        <div className="mt-1 text-muted-foreground">Date: {displayDate(employee.vtcDate)}</div>
                        <div className="text-muted-foreground">Due: {displayDate(employee.vtcExpiry)}</div>
                        <div className={employee.vtcDaysLeft !== null && employee.vtcDaysLeft < 0 ? "text-danger" : "text-muted-foreground"}>
                          Left: {employee.vtcDaysLeft === null ? "—" : `${employee.vtcDaysLeft} days`}
                        </div>
                      </div>}
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
        <>
          <EmployeeFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            employee={editingEmployee}
          />
          <EmployeeImportDialog open={importOpen} onOpenChange={setImportOpen} />
          <EmployeeFormDialog
            open={staffFormOpen}
            onOpenChange={setStaffFormOpen}
            initialEmployeeType="STAFF"
          />
        </>
      )}
    </div>
  );
}
