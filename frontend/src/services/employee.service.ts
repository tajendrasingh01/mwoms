import { apiClient } from "@/services/api-client";
import type {
  Employee,
  EmployeeFormValues,
  EmployeeListParams,
  EmployeeListResponse,
} from "@/types/employee";

export async function listEmployeesRequest(
  params: EmployeeListParams,
): Promise<EmployeeListResponse> {
  const { data } = await apiClient.get<EmployeeListResponse>("/employees", {
    params,
  });
  return data;
}

export async function createEmployeeRequest(
  payload: EmployeeFormValues,
): Promise<Employee> {
  const { data } = await apiClient.post<{ data: Employee }>(
    "/employees",
    payload,
  );
  return data.data;
}

export async function updateEmployeeRequest(
  id: string,
  payload: Partial<EmployeeFormValues>,
): Promise<Employee> {
  const { data } = await apiClient.put<{ data: Employee }>(
    `/employees/${id}`,
    payload,
  );
  return data.data;
}

export async function deactivateEmployeeRequest(id: string): Promise<Employee> {
  const { data } = await apiClient.delete<{ data: Employee }>(
    `/employees/${id}`,
  );
  return data.data;
}
