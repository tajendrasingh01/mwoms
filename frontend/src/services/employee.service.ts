import { apiClient } from "@/services/api-client";
import type {
  Employee,
  EmployeeFormValues,
  EmployeeImportPreviewData,
  EmployeeImportResult,
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

export async function listAllEmployeesRequest(
  params: Omit<EmployeeListParams, "page" | "pageSize">,
): Promise<Employee[]> {
  const employees: Employee[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await listEmployeesRequest({
      ...params,
      page,
      pageSize: 100,
    });
    employees.push(...response.data);
    totalPages = response.pagination.totalPages;
    page += 1;
  }

  return employees;
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

export async function previewEmployeeImportRequest(
  formData: FormData,
): Promise<EmployeeImportPreviewData> {
  const { data } = await apiClient.post<{ data: EmployeeImportPreviewData }>(
    "/employees/import/preview",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data.data;
}

export async function importEmployeeMasterRequest(
  formData: FormData,
): Promise<EmployeeImportResult> {
  const { data } = await apiClient.post<{ data: EmployeeImportResult }>(
    "/employees/import",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return data.data;
}
