import { Search, Plus } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExpiryStatusBadge } from "@/components/common/ExpiryStatusBadge";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useEmployees } from "@/hooks/use-employees";
import type { Employee } from "@/types/employee";

interface EmployeeSearchPickerProps {
  /** Employee IDs already assigned, so they're excluded from results. */
  excludeIds: Set<string>;
  onAdd: (employee: Employee) => void;
}

export function EmployeeSearchPicker({ excludeIds, onAdd }: EmployeeSearchPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const debouncedSetSearch = useDebouncedCallback((value: string) => setSearch(value), 300);

  const { data, isFetching } = useEmployees({ search, page: 1, pageSize: 10 });
  const results = (data?.data ?? []).filter((e) => !excludeIds.has(e.id));

  const handleAdd = (employee: Employee) => {
    // The requirement's "popup" for expired credentials — a hard stop
    // that requires explicit acknowledgment before assigning someone
    // whose PME or VTC has actually expired.
    if (employee.pmeStatus === "EXPIRED" || employee.vtcStatus === "EXPIRED") {
      const issues = [
        employee.pmeStatus === "EXPIRED" ? "PME" : null,
        employee.vtcStatus === "EXPIRED" ? "VTC" : null,
      ]
        .filter(Boolean)
        .join(" and ");
      const confirmed = window.confirm(
        `${employee.name} (${employee.employeeId}) has an EXPIRED ${issues}. Assigning them to shift work may violate CMR 2017 compliance. Add anyway?`,
      );
      if (!confirmed) return;
    }
    onAdd(employee);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees by name or ID to add..."
          className="pl-8"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
        />
      </div>

      {search && (
        <div className="max-h-48 overflow-y-auto rounded-md border border-border">
          {isFetching ? (
            <p className="p-3 text-sm text-muted-foreground">Searching…</p>
          ) : results.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matching active employees.</p>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((employee) => (
                <li
                  key={employee.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {employee.name}{" "}
                      <span className="font-normal text-muted-foreground">
                        ({employee.employeeId})
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.designation}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <ExpiryStatusBadge status={employee.pmeStatus} />
                    <ExpiryStatusBadge status={employee.vtcStatus} />
                    <Button size="icon" variant="ghost" onClick={() => handleAdd(employee)}>
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
