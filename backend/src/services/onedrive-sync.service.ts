import XLSX from "xlsx";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { parseWorksheetRows, rowToEmployeeData, validateParsedRows } from "@/controllers/employee.import.controller";

type SyncStatus = {
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastResult: { added: number; updated: number; skipped: number; errors: number } | null;
  lastError: string | null;
};

const status: SyncStatus = {
  configured: !!env.ONEDRIVE_EMPLOYEE_MASTER_URL,
  connected: false,
  lastSyncAt: null,
  lastResult: null,
  lastError: null,
};

export function getOneDriveStatus(): SyncStatus {
  return { ...status };
}

async function downloadWorkbook(): Promise<Buffer> {
  const url = new URL(env.ONEDRIVE_EMPLOYEE_MASTER_URL);
  url.searchParams.set("download", "1");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OneDrive could not download the employee master workbook (${response.status}). Check that its link is accessible to anyone with the link.`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("OneDrive returned a sign-in or preview page instead of the workbook. Change link access to Anyone with the link can view.");
  }
  return buffer;
}

async function importWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const categories = [
    { name: "DR", employeeType: "DAILY_RATED" as const },
    { name: "MR", employeeType: "MONTHLY_RATED" as const },
    { name: "SURFACE DR", employeeType: "SURFACE_DR" as const },
  ];
  const sheetsByName = new Map(workbook.SheetNames.map((name) => [name.trim().toUpperCase().replace(/\s+/g, " "), name]));
  const parsedRows = categories.map((category) => {
    const sheetName = sheetsByName.get(category.name);
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) throw new Error(`Workbook is missing the ${category.name} worksheet`);
    const rows = parseWorksheetRows(sheet, { employeeType: category.employeeType });
    return {
      category,
      rows,
      errors: validateParsedRows(rows),
    };
  });
  const errors = parsedRows.flatMap(({ errors: sheetErrors }) => sheetErrors);
  const validRows = parsedRows.flatMap(({ rows, errors: sheetErrors }) => {
    const invalidRows = new Set(sheetErrors.map((error) => error.row));
    return rows.filter((row) => !invalidRows.has(row.rowIndex));
  });
  const employeeTypes = new Map<string, string>();
  for (const { category, rows } of parsedRows) {
    for (const row of rows) {
      if (!row.employeeId) continue;
      const existingType = employeeTypes.get(row.employeeId);
      if (existingType) {
        throw new Error(`Employee ${row.employeeId} appears in both the ${existingType} and ${category.name} worksheets`);
      }
      employeeTypes.set(row.employeeId, category.name);
    }
  }
  let added = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const data = rowToEmployeeData(row);
      const existing = await tx.employee.findUnique({ where: { employeeId: data.employeeId }, select: { id: true } });
      if (existing) { await tx.employee.update({ where: { id: existing.id }, data: { ...data, experienceYrs: undefined, isActive: undefined } }); updated += 1; }
      else { await tx.employee.create({ data }); added += 1; }
    }
  }, { timeout: 60_000 });
  const skipped = parsedRows.reduce((total, { errors: sheetErrors }) => total + new Set(sheetErrors.map((error) => error.row)).size, 0);
  return { added, updated, skipped, errors: errors.length };
}

export async function syncOneDriveFiles() {
  try {
    const result = await importWorkbook(await downloadWorkbook());
    status.connected = true;
    status.lastSyncAt = new Date().toISOString();
    status.lastResult = result;
    status.lastError = null;
    return result;
  } catch (error) {
    status.connected = false;
    status.lastError = error instanceof Error ? error.message : "OneDrive sync failed";
    throw error;
  }
}

export function startOneDriveSync() {
  if (env.ONEDRIVE_SYNC_INTERVAL_MINUTES <= 0) return;
  const sync = () => { void syncOneDriveFiles().catch((error) => { status.lastError = error instanceof Error ? error.message : "OneDrive sync failed"; }); };
  sync();
  setInterval(sync, env.ONEDRIVE_SYNC_INTERVAL_MINUTES * 60_000);
}