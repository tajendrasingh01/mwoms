import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Search, Plus, Pencil, UserX, Loader2, FileUp, Download, Cloud, RefreshCw, Eye } from "lucide-react";
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEmployees, useDeactivateEmployee } from "@/hooks/use-employees";
import { listAllEmployeesRequest } from "@/services/employee.service";
import { apiClient } from "@/services/api-client";
import { useAuth } from "@/store/auth-store";
import type { Employee, EmploymentStatus } from "@/types/employee";

interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastResult: {
    added: number;
    updated: number;
    skipped: number;
    errors: number;
    conflicts: { employeeId: string; occurrences: { sheet: string; row: number }[] }[];
  } | null;
  lastError: string | null;
}

interface GoogleDrivePreviewRow {
  sheet: string;
  row: number;
  employeeId: string;
  name: string;
  employeeType: string;
  designation: string;
  grade: string;
  department: string;
  skill: string;
  dateOfBirth: string;
  dateOfJoining: string;
  pmeDate: string;
  pmeDue: string;
  vtcDate: string;
  vtcDue: string;
  relay: string;
  issues: string[];
}

interface GoogleDrivePreview {
  sheetNames: string[];
  sheetName: string;
  rows: GoogleDrivePreviewRow[];
  totalRows: number;
  matchedRows: number;
  truncated: boolean;
}

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "—";
}

export function EmployeesPage() {
  const { user } = useAuth();
  const canEdit = user?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [staffFormOpen, setStaffFormOpen] = useState(false);
  const [employeeType, setEmployeeType] = useState<"" | "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE">("");
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [relay, setRelay] = useState<"" | "RELAY_A" | "RELAY_B" | "RELAY_C">("");
  const [pmeStatus, setPmeStatus] = useState<"" | "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET">("");
  const [vtcStatus, setVtcStatus] = useState<"" | "EXPIRED" | "DUE_SOON" | "VALID" | "NOT_SET">("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [employmentStatus, setEmploymentStatus] = useState<"" | EmploymentStatus>("");
  const [isExporting, setIsExporting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSheet, setPreviewSheet] = useState("");
  const [previewSearchInput, setPreviewSearchInput] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);
  const debouncedSetPreviewSearch = useDebouncedCallback(setPreviewSearch, 250);

  const { data, isLoading, isFetching } = useEmployees({
    search,
    employeeType: employeeType || undefined,
    designation: designation || undefined,
    department: department || undefined,
    relay: relay || undefined,
    pmeStatus: pmeStatus || undefined,
    vtcStatus: vtcStatus || undefined,
    isActive: activeFilter ? activeFilter === "true" : undefined,
    employmentStatus: employmentStatus || undefined,
    page,
    pageSize: 25,
  });
  const deactivateEmployee = useDeactivateEmployee();
  const googleDriveStatus = useQuery({
    queryKey: ["google-drive", "status"],
    queryFn: async () => (await apiClient.get<{ data: GoogleDriveStatus }>("/google-drive/status")).data.data,
    enabled: canEdit,
    refetchInterval: 5000,
  });
  const syncGoogleDrive = useMutation({
    mutationFn: () => apiClient.post("/google-drive/sync"),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const googleDrivePreview = useQuery({
    queryKey: ["google-drive", "preview", previewSheet, previewSearch],
    queryFn: async () => (await apiClient.get<{ data: GoogleDrivePreview }>("/google-drive/preview", {
      params: { sheet: previewSheet || "ALL", employeeId: previewSearch || undefined },
    })).data.data,
    enabled: canEdit && previewOpen,
  });

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
        employmentStatus: employmentStatus || undefined,
      });

      const rows = employees.map((employee) => ({
        "Employee ID": employee.employeeId,
        Name: employee.name,
        "Father Name": employee.fatherName ?? "",
        "Employee Type": employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "SURFACE_DR" ? "Surface DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : employee.employeeType === "EXECUTIVE" ? "Executive" : "Staff",
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
        "Employment Status": employee.employmentStatus,
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

      {canEdit && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
          <Cloud className="size-4 text-muted-foreground" />
          <span className="font-medium">Google Drive employee master</span>
          {!googleDriveStatus.data?.configured ? (
            <span className="text-muted-foreground">Set GOOGLE_DRIVE_EMPLOYEE_MASTER_URL on the server.</span>
          ) : googleDriveStatus.data.connected ? (
            <span className="text-muted-foreground">
              Connected{googleDriveStatus.data.lastSyncAt ? ` · Last sync ${new Date(googleDriveStatus.data.lastSyncAt).toLocaleString()}` : " · Waiting for first sync"}
              {googleDriveStatus.data.lastResult ? ` · ${googleDriveStatus.data.lastResult.updated} updated, ${googleDriveStatus.data.lastResult.added} added` : ""}
              {googleDriveStatus.data.lastResult && (googleDriveStatus.data.lastResult.errors > 0 || (googleDriveStatus.data.lastResult.conflicts?.length ?? 0) > 0) ? ` · ${googleDriveStatus.data.lastResult.skipped} skipped, ${googleDriveStatus.data.lastResult.errors} validation issues, ${googleDriveStatus.data.lastResult.conflicts?.length ?? 0} cross-sheet ID conflicts` : ""}
            </span>
          ) : (
            <span className="text-muted-foreground">Google Drive link must allow anyone with the link to view.</span>
          )}
          {googleDriveStatus.data?.configured && (
            <>
              <Button variant="outline" size="sm" onClick={() => { setPreviewSheet("ALL"); setPreviewSearchInput(""); setPreviewSearch(""); setPreviewOpen(true); }}>
                <Eye />
                View sheet
              </Button>
              <Button variant="outline" size="sm" onClick={() => syncGoogleDrive.mutate()} disabled={syncGoogleDrive.isPending}>
                {syncGoogleDrive.isPending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                Sync now
              </Button>
            </>
          )}
          {(googleDriveStatus.data?.lastError || syncGoogleDrive.error) && (
            <span className="w-full text-xs text-danger">
              {googleDriveStatus.data?.lastError ?? "Google Drive request failed. Check the server configuration and try again."}
            </span>
          )}
          {googleDriveStatus.data?.lastResult?.conflicts?.map((conflict) => (
            <p key={conflict.employeeId} className="w-full text-xs text-danger">
              ID {conflict.employeeId} appears in {conflict.occurrences.map((item) => `${item.sheet} row ${item.row}`).join(" and ")}; those rows were skipped.
            </p>
          ))}
        </div>
      )}

      {canEdit && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-7xl">
            <DialogHeader>
              <DialogTitle>Google Drive employee sheet</DialogTitle>
              <DialogDescription>Read-only preview of the selected worksheet.</DialogDescription>
            </DialogHeader>
            {googleDrivePreview.isLoading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
            ) : googleDrivePreview.error ? (
              <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">
                {(googleDrivePreview.error as { response?: { data?: { error?: string } } }).response?.data?.error ?? "Could not load the Google Drive sheet."}
              </p>
            ) : googleDrivePreview.data ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="h-9 min-w-48 rounded-md border border-input bg-background px-3 text-sm" value={previewSheet || "ALL"} onChange={(event) => setPreviewSheet(event.target.value)}>
                      {googleDrivePreview.data.sheetNames.map((name) => <option key={name} value={name}>{name === "ALL" ? "All worksheets" : name}</option>)}
                    </select>
                    <Input
                      className="w-64"
                      placeholder="Search employee number"
                      value={previewSearchInput}
                      onChange={(event) => { setPreviewSearchInput(event.target.value); debouncedSetPreviewSearch(event.target.value); }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {previewSearch ? `${googleDrivePreview.data.matchedRows} matching rows` : `Showing ${googleDrivePreview.data.rows.length} of ${googleDrivePreview.data.totalRows} rows`}{googleDrivePreview.data.truncated ? " · first 100 matches shown" : ""}
                  </span>
                </div>
                <div className="max-h-[65vh] overflow-auto rounded-md border border-border">
                  <table className="min-w-max border-collapse text-xs">
                    <thead className="sticky top-0 bg-muted text-muted-foreground">
                      <tr>
                        {["Sheet", "Row", "Employee ID", "Name", "Type", "Designation", "Grade", "Department", "Skill", "DOB", "DOJ", "PME Date", "PME Due", "VTC Date", "VTC Due", "Relay", "Issues"].map((heading) => (
                          <th key={heading} className="border-b border-r border-border px-3 py-2 text-left font-medium">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {googleDrivePreview.data.rows.map((row) => (
                        <tr key={`${row.sheet}-${row.row}`} className="odd:bg-background even:bg-muted/20">
                          <td className="border-b border-r border-border px-3 py-1.5">{row.sheet}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.row}</td>
                          <td className="border-b border-r border-border px-3 py-1.5 font-medium">{row.employeeId || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.name || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.employeeType}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.designation || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.grade}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.department}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.skill}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.dateOfBirth || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.dateOfJoining || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.pmeDate || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.pmeDue || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.vtcDate || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.vtcDue || "—"}</td>
                          <td className="border-b border-r border-border px-3 py-1.5">{row.relay}</td>
                          <td className="max-w-72 border-b border-r border-border px-3 py-1.5 text-danger">{row.issues.join("; ") || "—"}</td>
                        </tr>
                      ))}
                      {googleDrivePreview.data.rows.length === 0 && (
                        <tr><td colSpan={17} className="px-3 py-8 text-center text-muted-foreground">No employee rows match this search.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-1 gap-2 rounded-md border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-8">
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={employeeType} onChange={(e) => { setEmployeeType(e.target.value as typeof employeeType); setPage(1); }}>
          <option value="">All groups</option>
          <option value="DAILY_RATED">DR - Daily Rated</option>
          <option value="SURFACE_DR">Surface DR</option>
          <option value="MONTHLY_RATED">MR - Monthly Rated</option>
          <option value="STAFF">Staff</option>
          <option value="EXECUTIVE">Executive</option>
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
        <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={employmentStatus} onChange={(e) => { setEmploymentStatus(e.target.value as typeof employmentStatus); setPage(1); }}>
          <option value="">All employment statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="TRANSFERRED">Transferred</option>
          <option value="NOT_ENROLLED">Not Enrolled</option>
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
                        {employee.employeeType === "DAILY_RATED" ? "DR" : employee.employeeType === "SURFACE_DR" ? "Surface DR" : employee.employeeType === "MONTHLY_RATED" ? "MR" : employee.employeeType === "EXECUTIVE" ? "Executive" : "Staff"}
                      </Badge>
                    </TableCell>
                    <TableCell>{employee.age ?? "—"}</TableCell>
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
                      {employee.employeeType === "MONTHLY_RATED" || employee.employeeType === "STAFF" || employee.employeeType === "EXECUTIVE" ? (
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
                      <Badge variant={employee.employmentStatus === "ACTIVE" && employee.isActive ? "success" : "secondary"}>
                        {employee.employmentStatus === "TRANSFERRED" ? "Transferred" : employee.employmentStatus === "NOT_ENROLLED" ? "Not Enrolled" : employee.isActive ? "Active" : "Inactive"}
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
