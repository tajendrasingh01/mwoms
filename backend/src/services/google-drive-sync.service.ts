import XLSX from "xlsx";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { calculatePmeDueDate } from "@/lib/employee-utils";
import { parseWorksheetRows, rowToEmployeeData, validateParsedRows } from "@/controllers/employee.import.controller";

type SyncStatus = {
  configured: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastResult: { added: number; updated: number; skipped: number; errors: number } | null;
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

async function importWorkbook(buffer: Buffer) {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new Error("Google Drive file could not be read as an Excel workbook. Check that it is an .xlsx file or a Google Sheet.");
  }
  const categories = [
    { name: "DR", aliases: ["DR", "DAILY RATED", "DAILY RATED WORKERS"], employeeType: "DAILY_RATED" as const, department: "Daily Rated" },
    { name: "MR", aliases: ["MR", "MONTHLY RATED", "MONTHLY RATED EMPLOYEES"], employeeType: "MONTHLY_RATED" as const, department: "Monthly Rated" },
    { name: "SURFACE DR", aliases: ["SURFACE DR", "SURFACE DAILY RATED", "SURFACE DAILY RATED WORKERS"], employeeType: "SURFACE_DR" as const, department: "Surface DR" },
  ];
  const sheetsByName = new Map(workbook.SheetNames.map((name) => [name.trim().toUpperCase().replace(/\s+/g, " "), name]));
  const parsedRows = categories.map((category) => {
    const sheetName = category.aliases.map((alias) => sheetsByName.get(alias)).find(Boolean);
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) throw new Error(`Workbook is missing the ${category.name} worksheet. Found: ${workbook.SheetNames.join(", ") || "no worksheets"}.`);
    const rows = parseWorksheetRows(sheet, { employeeType: category.employeeType, gradeFallback: category.name, departmentFallback: category.department })
      .map((row) => ({
        ...row,
        grade: category.name,
        department: category.department,
        skill: row.designation || "General Duty",
        pmeExpiry: undefined,
        vtcExpiry: undefined,
      }));
    return { category, rows, errors: validateParsedRows(rows) };
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
      const existing = await tx.employee.findUnique({ where: { employeeId: data.employeeId }, select: { id: true, dateOfBirth: true, dateOfJoining: true } });
      if (existing) {
        const dateOfBirth = data.dateOfBirth ?? existing.dateOfBirth;
        await tx.employee.update({
          where: { id: existing.id },
          data: {
            ...data,
            dateOfBirth,
            dateOfJoining: data.dateOfJoining ?? existing.dateOfJoining,
            pmeExpiry: data.pmeDate && dateOfBirth ? calculatePmeDueDate(dateOfBirth, data.pmeDate) : null,
            experienceYrs: undefined,
            isActive: undefined,
          },
        });
        updated += 1;
      } else {
        await tx.employee.create({ data });
        added += 1;
      }
    }
  }, { timeout: 60_000 });

  const skipped = parsedRows.reduce((total, { errors: sheetErrors }) => total + new Set(sheetErrors.map((error) => error.row)).size, 0);
  return { added, updated, skipped, errors: errors.length };
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