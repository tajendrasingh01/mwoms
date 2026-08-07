import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  listEmployeesRequest,
  createEmployeeRequest,
  updateEmployeeRequest,
  deactivateEmployeeRequest,
} from "@/services/employee.service";
import type { EmployeeFormValues, EmployeeListParams } from "@/types/employee";

const EMPLOYEES_QUERY_KEY = "employees" as const;

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: [EMPLOYEES_QUERY_KEY, params],
    queryFn: () => listEmployeesRequest(params),
    placeholderData: (previousData) => previousData, // keep table stable while paginating/searching
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: EmployeeFormValues) => createEmployeeRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Partial<EmployeeFormValues>;
    }) => updateEmployeeRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}

export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateEmployeeRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [EMPLOYEES_QUERY_KEY] });
    },
  });
}
