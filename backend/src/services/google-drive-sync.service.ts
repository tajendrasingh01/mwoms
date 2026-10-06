import XLSX from "xlsx";
import type { Prisma } from "@prisma/client";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { calculatePmeDueDate, calculateVtcDueDate } from "@/lib/employee-utils";
import { parseWorksheetRows, rowToEmployeeData, validateParsedRows } from "@/controllers/employee.import.controller";

const EMPLOYEE_CATEGORIES = [
  { name: "DR", aliases: ["DR", "DAILY RATED", "DAILY RATED WORKERS"], employeeType: "DAILY_RATED" as const, department: "Daily Rated" },
  { name: "MR", aliases: ["MR", "MONTHLY RATED", "MONTHLY RATED EMPLOYEES"], employeeType: "MONTHLY_RATED" as const, department: "Monthly Rated" },
  { name: "SURFACE DR", aliases: ["SURFACE DR", "SURFACE DAILY RATED", "SURFACE DAILY RATED WORKERS"], employeeType: "SURFACE_DR" as const, department: "Surface DR" },
];

type EmployeeCategory = typeof EMPLOYEE_CATEGORIES[number];
type WorkbookConflict = { employeeId: string; occurrences: { sheet: string; row: number }[] };

type SyncStatus = {
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastResult: { added: number; updated: number; skipped: number; errors: number; conflicts: WorkbookConflict[] } | null;
  lastError: string | null;
};

const status: SyncStatus = {
  configured: !!env.GOOGLE_DRIVE_EMPLOYEE_MASTER_URL,
  connected: false,
  lastSyncAt: null,
  lastResult: null,
  lastError: null,
};

export function getGoogleDriveStatus(): SyncStatus {
  return { ...status };
}

function normalizeSheetName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function parseCategoryRows(sheet: XLSX.WorkSheet, category: EmployeeCategory) {
  return parseWorksheetRows(sheet, {
    employeeType: category.employeeType,
    gradeFallback: category.name,
    departmentFallback: category.department,
  }).map((row) => ({
    ...row,
    grade: category.name,
    department: category.department,
    skill: row.designation || "General Duty",
    pmeExpiry: undefined,
    vtcExpiry: undefined,
  }));
}

function workbookFromBuffer(buffer: Buffer): XLSX.WorkBook {
  try {
    return XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new Error("Google Drive file could not be read as an Excel workbook. Check that it is an .xlsx file or a Google Sheet.");
  }
}

function dateToPreview(value: Date | null | undefined): string {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : "";
}

export async function previewGoogleDriveEmployeeMaster(sheetName?: string, employeeIdQuery?: string) {
  const workbook = workbookFromBuffer(await downloadWorkbook());
  const availableSheets = new Map(workbook.SheetNames.map((name) => [normalizeSheetName(name), name]));
  const categories = sheetName && sheetName !== "ALL"
    ? EMPLOYEE_CATEGORIES.filter((category) => category.aliases.includes(normalizeSheetName(sheetName)))
    : EMPLOYEE_CATEGORIES;
  if (categories.length === 0) throw new Error(`Unsupported employee worksheet: ${sheetName}`);

  const cleanRows = categories.flatMap((category) => {
    const sourceSheetName = category.aliases.map((alias) => availableSheets.get(alias)).find(Boolean);
    const sheet = sourceSheetName ? workbook.Sheets[sourceSheetName] : undefined;
    if (!sheet || !sourceSheetName) throw new Error(`Workbook is missing the ${category.name} worksheet.`);
    const parsedRows = parseCategoryRows(sheet, category);
    const errorsByRow = new Map<number, string[]>();
    for (const error of validateParsedRows(parsedRows)) {
      const rowErrors = errorsByRow.get(error.row) ?? [];
      rowErrors.push(`${error.field ?? "Row"}: ${error.error}`);
      errorsByRow.set(error.row, rowErrors);
    }
    return parsedRows.map((row) => ({
      sheet: sourceSheetName,
      row: row.rowIndex,
      employeeId: row.employeeId ?? "",
      name: row.name ?? "",
      employeeType: category.name,
      designation: row.designation ?? "",
      grade: category.name,
      department: category.department,
      skill: row.designation || "General Duty",
      dateOfBirth: dateToPreview(row.dateOfBirth),
      dateOfJoining: dateToPreview(row.dateOfJoining),
      pmeDate: dateToPreview(row.pmeDate),
      pmeDue: dateToPreview(row.pmeDate && row.dateOfBirth ? calculatePmeDueDate(row.dateOfBirth, row.pmeDate) : null),
      vtcDate: dateToPreview(row.vtcDate),
      vtcDue: dateToPreview(row.vtcDate ? calculateVtcDueDate(row.vtcDate) : null),
      relay: row.relay?.replace("RELAY_", "Relay ") ?? "Relay A",
      issues: errorsByRow.get(row.rowIndex) ?? [],
    }));
  });
  const conflicts = new Map<string, { sheet: string; row: number }[]>();
  for (const row of cleanRows) {
    if (!row.employeeId) continue;
    const occurrences = conflicts.get(row.employeeId) ?? [];
    occurrences.push({ sheet: row.sheet, row: row.row });
    conflicts.set(row.employeeId, occurrences);
  }
  for (const [employeeId, occurrences] of conflicts) {
    if (new Set(occurrences.map((occurrence) => occurrence.sheet)).size < 2) continue;
    for (const occurrence of occurrences) {
      const row = cleanRows.find((item) => item.sheet === occurrence.sheet && item.row === occurrence.row && item.employeeId === employeeId);
      row?.issues.push(`Employee ID also appears in ${occurrences.filter((item) => item.sheet !== occurrence.sheet).map((item) => `${item.sheet} row ${item.row}`).join(", ")}.`);
    }
  }

  const query = employeeIdQuery?.trim().toLowerCase();
  const matchedRows = query ? cleanRows.filter((row) => row.employeeId.toLowerCase().includes(query)) : cleanRows;
  const maxRows = 100;

  return {
    sheetNames: ["ALL", ...workbook.SheetNames],
    sheetName: sheetName ?? "ALL",
    rows: matchedRows.slice(0, maxRows),
    totalRows: cleanRows.length,
    matchedRows: matchedRows.length,
    truncated: matchedRows.length > maxRows,
  };
}

async function downloadWorkbook(): Promise<Buffer> {
  if (!env.GOOGLE_DRIVE_EMPLOYEE_MASTER_URL) {
    throw new Error("Set GOOGLE_DRIVE_EMPLOYEE_MASTER_URL to the publicly shared employee workbook.");
  }

  const { id, isGoogleSheet } = getDriveFile(env.GOOGLE_DRIVE_EMPLOYEE_MASTER_URL);
  const downloadUrl = isGoogleSheet
    ? `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
    : `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&authuser=0&confirm=t`;
  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Google Drive could not download the employee master workbook (${response.status}). Check its sharing permission.`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error("Google Drive returned a web page instead of an Excel workbook. Set sharing to Anyone with the link: Viewer.");
  }
  return buffer;
}

function getDriveFile(urlString: string) {
  const url = new URL(urlString);
  if (url.hostname !== "drive.google.com" && url.hostname !== "docs.google.com") {
    throw new Error("The employee master URL must be a Google Drive or Google Sheets sharing link.");
  }

  const pathMatch = url.pathname.match(/\/(?:file|spreadsheets)\/d\/([\w-]+)/);
  const id = url.searchParams.get("id") ?? pathMatch?.[1];
  if (!id || !/^[\w-]+$/.test(id)) {
    throw new Error("Could not find a Google Drive file ID in the employee master URL.");
  }

  return {
    id,
    isGoogleSheet: url.hostname === "docs.google.com" && url.pathname.includes("/spreadsheets/"),
  };
}

async function importWorkbook(buffer: Buffer) {
  const workbook = workbookFromBuffer(buffer);
  const sheetsByName = new Map(workbook.SheetNames.map((name) => [normalizeSheetName(name), name]));
  const parsedRows = EMPLOYEE_CATEGORIES.map((category) => {
    const sheetName = category.aliases.map((alias) => sheetsByName.get(alias)).find(Boolean);
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) throw new Error(`Workbook is missing the ${category.name} worksheet. Found: ${workbook.SheetNames.join(", ") || "no worksheets"}.`);
    const rows = parseCategoryRows(sheet, category);
    return { category, rows, errors: validateParsedRows(rows) };
  });
  const errors = parsedRows.flatMap(({ errors: sheetErrors }) => sheetErrors);
  const validRows = parsedRows.flatMap(({ rows, errors: sheetErrors }) => {
    const invalidRows = new Set(sheetErrors.map((error) => error.row));
    return rows.filter((row) => !invalidRows.has(row.rowIndex));
  });
  const occurrencesById = new Map<string, { category: string; row: number }[]>();
  for (const { category, rows } of parsedRows) {
    for (const row of rows) {
      if (!row.employeeId) continue;
      const occurrences = occurrencesById.get(row.employeeId) ?? [];
      occurrences.push({ category: category.name, row: row.rowIndex });
      occurrencesById.set(row.employeeId, occurrences);
    }
  }
  const conflicts = [...occurrencesById.entries()]
    .filter(([, occurrences]) => new Set(occurrences.map((occurrence) => occurrence.category)).size > 1)
    .map(([employeeId, occurrences]) => ({
      employeeId,
      occurrences: occurrences.map((occurrence) => ({ sheet: occurrence.category, row: occurrence.row })),
    }));
  const conflictingIds = new Set(conflicts.map((conflict) => conflict.employeeId));
  const importRows = validRows.filter((row) => !conflictingIds.has(row.employeeId!));

  const sourceData = importRows.map(rowToEmployeeData);
  const existingEmployees = sourceData.length > 0
    ? await prisma.employee.findMany({
        where: { employeeId: { in: sourceData.map((employee) => employee.employeeId) } },
        select: { id: true, employeeId: true, dateOfBirth: true, dateOfJoining: true },
      })
    : [];
  const existingById = new Map(existingEmployees.map((employee) => [employee.employeeId, employee]));
  const newEmployees: typeof sourceData = [];
  const employeeUpdates: { id: string; data: Prisma.EmployeeUpdateInput }[] = [];

  for (const data of sourceData) {
    const existing = existingById.get(data.employeeId);
    if (!existing) {
      newEmployees.push(data);
      continue;
    }

    const dateOfBirth = data.dateOfBirth ?? existing.dateOfBirth;
    employeeUpdates.push({
      id: existing.id,
      data: {
        ...data,
        dateOfBirth,
        dateOfJoining: data.dateOfJoining ?? existing.dateOfJoining,
        pmeExpiry: data.pmeDate && dateOfBirth ? calculatePmeDueDate(dateOfBirth, data.pmeDate) : null,
        experienceYrs: undefined,
        isActive: undefined,
      },
    });
  }

  let added = 0;
  const createBatchSize = 500;
  for (let offset = 0; offset < newEmployees.length; offset += createBatchSize) {
    const result = await prisma.employee.createMany({
      data: newEmployees.slice(offset, offset + createBatchSize),
      skipDuplicates: true,
    });
    added += result.count;
  }

  let updated = 0;
  const updateBatchSize = 25;
  for (let offset = 0; offset < employeeUpdates.length; offset += updateBatchSize) {
    const batch = employeeUpdates.slice(offset, offset + updateBatchSize);
    await Promise.all(batch.map(({ id, data }) => prisma.employee.update({ where: { id }, data })));
    updated += batch.length;
  }

  const skipped = parsedRows.reduce((total, { errors: sheetErrors }) => total + new Set(sheetErrors.map((error) => error.row)).size, 0);
  return { added, updated, skipped: skipped + conflicts.reduce((total, conflict) => total + conflict.occurrences.length, 0), errors: errors.length, conflicts };
}

export async function syncGoogleDriveEmployeeMaster() {
  try {
    const result = await importWorkbook(await downloadWorkbook());
    status.connected = true;
    status.lastSyncAt = new Date().toISOString();
    status.lastResult = result;
    status.lastError = null;
    return result;
  } catch (error) {
    status.connected = false;
    status.lastError = error instanceof Error ? error.message : "Google Drive sync failed";
    throw error;
  }
}

export function startGoogleDriveSync() {
  if (!env.GOOGLE_DRIVE_EMPLOYEE_MASTER_URL || env.GOOGLE_DRIVE_SYNC_INTERVAL_MINUTES <= 0) return;
  const sync = () => { void syncGoogleDriveEmployeeMaster().catch(() => undefined); };
  sync();
  setInterval(sync, env.GOOGLE_DRIVE_SYNC_INTERVAL_MINUTES * 60_000);
}