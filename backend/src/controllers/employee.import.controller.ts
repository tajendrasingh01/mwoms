import type { Request, Response } from "express";
import XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { calculatePmeDueDate, calculateVtcDueDate } from "@/lib/employee-utils";

type MulterRequest = Request & { file?: Express.Multer.File };

const HEADER_TO_FIELD: Record<string, string> = {
  "eis no": "employeeId",
  "eis no.": "employeeId",
  "employee id": "employeeId",
  name: "name",
  "father name": "fatherName",
  designation: "designation",
  grade: "grade",
  department: "department",
  skill: "skill",
  dob: "dateOfBirth",
  "date of birth": "dateOfBirth",
  doa: "dateOfJoining",
  "date of joining": "dateOfJoining",
  pme: "pmeDate",
  "pme date": "pmeDate",
  vtc: "vtcDate",
  "vtc date": "vtcDate",
  age: "age",
  "due pme": "duePme",
  "pme due": "duePme",
  "left days pme": "leftDaysPme",
  "expiry pme": "pmeExpiry",
  "due vtc": "dueVtc",
  "vtc due": "dueVtc",
  "left days vtc": "leftDaysVtc",
  "expiry vtc": "vtcExpiry",
  "medical conditions": "medicalConditions",
  remark: "remark",
  relay: "relay",
  "employee type": "employeeType",
};

const REQUIRED_HEADERS = ["eis no", "name", "designation", "dob", "doa"];

interface ParsedEmployeeRow {
  rowIndex: number;
  employeeId?: string;
  name?: string;
  fatherName?: string;
  designation?: string;
  department?: string;
  skill?: string;
  dateOfBirth?: Date;
  dateOfJoining?: Date;
  pmeDate?: Date | null;
  pmeExpiry?: Date | null;
  vtcDate?: Date | null;
  vtcExpiry?: Date | null;
  employeeType?: "DAILY_RATED" | "SURFACE_DR" | "MONTHLY_RATED" | "STAFF" | "EXECUTIVE";
  grade?: string | null;
  medicalConditions?: string | null;
  remark?: string | null;
  relay?: "RELAY_A" | "RELAY_B" | "RELAY_C";
}

interface ImportError {
  row: number;
  employeeId?: string;
  field?: string;
  error: string;
}

function normalizeHeader(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

const RELAY_DISPLAY_TO_INTERNAL: Record<string, "RELAY_A" | "RELAY_B" | "RELAY_C"> = {
  "relay a": "RELAY_A",
  "relay b": "RELAY_B",
  "relay c": "RELAY_C",
};

function parseExcelRelay(value: unknown): "RELAY_A" | "RELAY_B" | "RELAY_C" | undefined {
  if (typeof value !== "string") return undefined;
  return RELAY_DISPLAY_TO_INTERNAL[value.trim().toLowerCase()];
}

function parseExcelEmployeeType(value: unknown): ParsedEmployeeRow["employeeType"] {
  if (typeof value !== "string") return undefined;
  switch (value.trim().toLowerCase()) {
    case "surface dr":
    case "surface daily rated":
      return "SURFACE_DR";
    case "mr":
    case "monthly rated":
      return "MONTHLY_RATED";
    case "staff":
      return "STAFF";
    case "executive":
      return "EXECUTIVE";
    case "dr":
    case "daily rated":
      return "DAILY_RATED";
    default:
      return undefined;
  }
}

function parseExcelDate(value: unknown): Date | undefined | null {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && typeof parsed === "object" && "y" in parsed && parsed.y) {
      return new Date(parsed.y, (parsed.m ?? 1) - 1, parsed.d ?? 1);
    }
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  if (["new", "n/a", "na", "-", "—"].includes(trimmed.toLowerCase())) return undefined;
  const parts = trimmed.replace(/[-.]/g, "/").split("/").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [first, second, rawYear] = parts;
    let year = rawYear;
    if (year < 100) year += year >= 50 ? 1900 : 2000;
    const dayFirst = first > 12 || (second <= 12 && trimmed.split("/")[2].length === 4);
    const day = dayFirst ? first : second;
    const month = (dayFirst ? second : first) - 1;
    const parsed = new Date(year, month, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day ? parsed : null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseWorksheetRows(sheet: XLSX.WorkSheet, options: { surfaceWorkbook?: boolean } = {}): ParsedEmployeeRow[] {
  const rawRows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: null,
  });

  if (rawRows.length === 0) {
    return [];
  }

  const headersRow = rawRows[0] as unknown[];
  const headerKeys = headersRow.map(normalizeHeader);
  const isMonthlyRated = headerKeys.includes("grade") && !headerKeys.includes("vtc");

  const requiredHeaderAliases: Record<string, string[]> = {
    "eis no": ["eis no", "employee id"],
    name: ["name"],
    designation: ["designation"],
    dob: ["dob", "date of birth"],
    doa: ["doa", "date of joining"],
  };
  for (const required of REQUIRED_HEADERS) {
    if (!requiredHeaderAliases[required].some((alias) => headerKeys.includes(alias))) {
      throw new Error(`Missing required column: ${required}`);
    }
  }

  const fieldIndexes = headerKeys.reduce<Record<number, string>>((acc, header, index) => {
    if (HEADER_TO_FIELD[header]) {
      acc[index] = HEADER_TO_FIELD[header];
    }
    return acc;
  }, {});

  return rawRows.slice(1).filter((rawRow) => rawRow.some((value) => value !== null && String(value).trim() !== "")).map((rawRow: (string | number | Date | null)[], rowIndex: number) => {
    const parsedRow: ParsedEmployeeRow = { rowIndex: rowIndex + 2 };
    rawRow.forEach((cellValue, columnIndex) => {
      const field = fieldIndexes[columnIndex];
      if (!field) return;
      const trimmed = typeof cellValue === "string" ? cellValue.trim() : cellValue;
      switch (field) {
        case "employeeId":
          parsedRow.employeeId = trimmed !== null && trimmed !== undefined ? String(trimmed).trim() || undefined : undefined;
          break;
        case "name":
          parsedRow.name = typeof trimmed === "string" ? trimmed : undefined;
          break;
        case "employeeType":
          parsedRow.employeeType = parseExcelEmployeeType(trimmed);
          break;
        case "fatherName":
          parsedRow.fatherName = typeof trimmed === "string" ? trimmed || undefined : undefined;
          break;
        case "designation":
          parsedRow.designation = typeof trimmed === "string" ? trimmed : undefined;
          break;
        case "grade":
          parsedRow.grade = trimmed === null || trimmed === undefined ? null : String(trimmed).trim() || null;
          break;
        case "department":
          parsedRow.department = typeof trimmed === "string" ? trimmed : undefined;
          break;
        case "skill":
          parsedRow.skill = typeof trimmed === "string" ? trimmed : undefined;
          break;
        case "dateOfBirth":
          parsedRow.dateOfBirth = parseExcelDate(trimmed) ?? undefined;
          break;
        case "dateOfJoining":
          parsedRow.dateOfJoining = parseExcelDate(trimmed) ?? undefined;
          break;
        case "pmeDate":
          parsedRow.pmeDate = parseExcelDate(trimmed) ?? undefined;
          break;
        case "pmeExpiry":
          parsedRow.pmeExpiry = parseExcelDate(trimmed) ?? undefined;
          break;
        case "duePme":
          parsedRow.pmeExpiry = parseExcelDate(trimmed) ?? undefined;
          break;
        case "vtcDate":
          parsedRow.vtcDate = parseExcelDate(trimmed) ?? undefined;
          break;
        case "vtcExpiry":
          parsedRow.vtcExpiry = parseExcelDate(trimmed) ?? undefined;
          break;
        case "dueVtc":
          parsedRow.vtcExpiry = parseExcelDate(trimmed) ?? undefined;
          break;
        case "medicalConditions":
          parsedRow.medicalConditions = typeof trimmed === "string" ? trimmed || undefined : undefined;
          break;
        case "remark":
          parsedRow.remark = typeof trimmed === "string" ? trimmed || undefined : undefined;
          break;
        case "relay":
          parsedRow.relay = parseExcelRelay(trimmed);
          break;
        default:
          break;
      }
    });
    parsedRow.department = parsedRow.department || (isMonthlyRated ? "Monthly Rated Employees" : "Daily Rated Workers");
    parsedRow.skill = parsedRow.skill || parsedRow.designation || "General Duty";
    parsedRow.relay = parsedRow.relay || "RELAY_A";
    parsedRow.employeeType = options.surfaceWorkbook ? "SURFACE_DR" : parsedRow.employeeType ?? (isMonthlyRated ? "MONTHLY_RATED" : "DAILY_RATED");
    return parsedRow;
  });
}

export function validateParsedRows(rows: ParsedEmployeeRow[]): ImportError[] {
  const errors: ImportError[] = [];
  const seenEis = new Map<string, number[]>();
  const now = new Date();

  for (const row of rows) {
    const rowIndex = row.rowIndex;
    if (!row.employeeId) {
      errors.push({ row: rowIndex, field: "EIS No.", error: "EIS No. is required" });
    }
    if (!row.name) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Name", error: "Name is required" });
    }
    if (!row.designation) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Designation", error: "Designation is required" });
    }
    if (!row.department) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Department", error: "Department is required" });
    }
    if (!row.skill) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Skill", error: "Skill is required" });
    }
    if (!row.dateOfBirth) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "DOB", error: "DOB is required and must be a valid date" });
    }
    if (!row.dateOfJoining) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "DOA", error: "DOA is required and must be a valid date" });
    }
    if (!row.relay) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Relay", error: "Relay is required and must be Relay A, Relay B, or Relay C" });
    }
    if (row.pmeDate === null) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "PME", error: "PME must be a valid date or blank" });
    }
    if (row.pmeExpiry === null) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Expiry PME", error: "Expiry PME must be a valid date or blank" });
    }
    if (row.employeeType !== "MONTHLY_RATED" && row.employeeType !== "STAFF" && row.employeeType !== "EXECUTIVE" && row.vtcDate === null) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "VTC", error: "VTC must be a valid date or blank" });
    }
    if (row.employeeType !== "MONTHLY_RATED" && row.employeeType !== "STAFF" && row.employeeType !== "EXECUTIVE" && row.vtcExpiry === null) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "Expiry VTC", error: "Expiry VTC must be a valid date or blank" });
    }
    if (row.employeeId) {
      const key = row.employeeId.trim();
      if (!seenEis.has(key)) {
        seenEis.set(key, []);
      }
      seenEis.get(key)!.push(rowIndex);
    }
    if (row.dateOfBirth instanceof Date && row.dateOfBirth > now) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "DOB", error: "DOB cannot be in the future" });
    }
    if (row.dateOfJoining instanceof Date && row.dateOfJoining > now) {
      errors.push({ row: rowIndex, employeeId: row.employeeId, field: "DOA", error: "DOA cannot be in the future" });
    }
  }

  for (const [employeeId, indexes] of seenEis.entries()) {
    if (indexes.length > 1) {
      for (const rowIndex of indexes) {
        errors.push({ row: rowIndex, employeeId, field: "EIS No.", error: "Duplicate EIS No. in Excel file" });
      }
    }
  }

  return errors;
}

export function rowToEmployeeData(row: ParsedEmployeeRow) {
  const pmeDate = row.pmeDate ?? null;
  const vtcDate = row.employeeType !== "MONTHLY_RATED" && row.employeeType !== "STAFF" && row.employeeType !== "EXECUTIVE" ? row.vtcDate ?? null : null;
  const pmeExpiry = row.pmeExpiry ?? (pmeDate ? calculatePmeDueDate(row.dateOfBirth!, pmeDate) : null);
  const vtcExpiry = row.vtcExpiry ?? (vtcDate ? calculateVtcDueDate(vtcDate) : null);
  return {
    employeeId: row.employeeId!.trim(),
    name: row.name!.trim(),
    fatherName: row.fatherName?.trim() || null,
    designation: row.designation!.trim(),
    grade: row.grade?.trim() || null,
    department: row.department!.trim(),
    skill: row.skill!.trim(),
    dateOfBirth: row.dateOfBirth!,
    dateOfJoining: row.dateOfJoining!,
    pmeDate,
    pmeExpiry,
    vtcDate,
    vtcExpiry,
    medicalConditions: row.medicalConditions?.trim() || null,
    remark: row.remark?.trim() || null,
    relay: row.relay!,
    employeeType: row.employeeType ?? "DAILY_RATED",
    // Experience is not supplied by the template as a reliable value.
    // The app continues to preserve this field, but imported rows set
    // a default of 0 so they become valid employee records.
    experienceYrs: 0,
    isActive: true,
  };
}

export async function previewEmployeeImport(req: MulterRequest, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Excel file is required" });
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return res.status(400).json({ error: "Excel file must contain at least one worksheet" });
  }

  let rows: ParsedEmployeeRow[];
  try {
    rows = parseWorksheetRows(sheet, { surfaceWorkbook: /surface/i.test(file.originalname) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: "Excel file contains no data rows" });
  }

  const validationErrors = validateParsedRows(rows);
  const uniqueEmployeeIds = [...new Set(rows.map((r) => r.employeeId?.trim()).filter(Boolean) as string[])];
  const existingEmployees = await prisma.employee.findMany({
    where: { employeeId: { in: uniqueEmployeeIds } },
    select: { employeeId: true },
  });
  const existingSet = new Set(existingEmployees.map((e) => e.employeeId));
  const newCount = rows.filter((row) => row.employeeId && !existingSet.has(row.employeeId.trim())).length;
  const updateCount = rows.filter((row) => row.employeeId && existingSet.has(row.employeeId.trim())).length;

  const duplicateRows = validationErrors.filter((err) => err.field === "EIS No.").length;

  return res.json({
    data: {
      total: rows.length,
      valid: rows.length - validationErrors.length,
      invalid: validationErrors.length,
      newCount,
      updateCount,
      duplicateRows,
      errors: validationErrors,
      cleaning: [
        "Ignored blank rows.",
        "Mapped Due PME and Due VTC to PME/VTC expiry dates.",
        "Parsed DOB and DOA as day/month/year; parsed medical dates as month/day/year when the source used two-digit years.",
        "Set missing department to Daily Rated Workers, skill to the designation, and relay to Relay A.",
        "Detected Monthly Rated format when Grade is present and VTC is absent; otherwise detected Daily Rated format.",
        "Monthly Rated records retain PME and leave VTC blank.",
      ],
    },
  });
}

function buildTemplateWorkbook() {
  const headers = [
    "EIS No.",
    "Name",
    "Father Name",
    "Designation",
    "Department",
    "Skill",
    "DOB",
    "DOA",
    "PME",
    "VTC",
    "Age",
    "Due PME",
    "Left Days PME",
    "Expiry PME",
    "Due VTC",
    "Left Days VTC",
    "Expiry VTC",
    "Medical Conditions",
    "Remark",
    "Relay",
  ];

  const exampleRow = [
    "EMP1234",
    "Ravi Kumar",
    "Suresh Kumar",
    "Overman",
    "Stores",
    "Electrical",
    "1990-01-15",
    "2015-06-01",
    "2025-01-15",
    "2025-12-01",
    "34",
    "2024-12-15",
    "30",
    "2025-01-15",
    "2025-11-01",
    "45",
    "2025-12-01",
    "None",
    "Plant based worker",
    "Relay A",
  ];

  const rows = [headers, exampleRow, [
    "",
    "",
    "",
    "",
    "",
    "",
    "YYYY-MM-DD",
    "YYYY-MM-DD",
    "YYYY-MM-DD",
    "YYYY-MM-DD",
    "",
    "",
    "",
    "YYYY-MM-DD",
    "",
    "",
    "YYYY-MM-DD",
    "",
    "",
    "Relay A / Relay B / Relay C",
  ]];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Master");
  return workbook;
}

export async function downloadEmployeeTemplate(_req: Request, res: Response) {
  const workbook = buildTemplateWorkbook();
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=employee-master-template.xlsx");
  return res.send(buffer);
}

export async function importEmployeeMaster(req: MulterRequest, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "Excel file is required" });
  }

  const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    return res.status(400).json({ error: "Excel file must contain at least one worksheet" });
  }

  let rows: ParsedEmployeeRow[];
  try {
    rows = parseWorksheetRows(sheet, { surfaceWorkbook: /surface/i.test(file.originalname) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }

  if (rows.length === 0) {
    return res.status(400).json({ error: "Excel file contains no data rows" });
  }

  const validationErrors = validateParsedRows(rows);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: "Import contains invalid rows",
      details: validationErrors,
    });
  }

  const employeeIds = rows.map((row) => row.employeeId!.trim());
  const existingEmployees = await prisma.employee.findMany({
    where: { employeeId: { in: employeeIds } },
    select: { id: true, employeeId: true, pmeDate: true, vtcDate: true },
  });
  const existingMap = new Map(existingEmployees.map((employee) => [employee.employeeId, employee]));

  const results = {
    added: 0,
    updated: 0,
    failed: 0,
  };

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        const rowData = rowToEmployeeData(row);
        const existing = existingMap.get(rowData.employeeId);
        if (existing) {
          const updateData = {
            name: rowData.name,
            fatherName: row.fatherName !== undefined ? rowData.fatherName : undefined,
            designation: rowData.designation,
            grade: row.grade !== undefined ? rowData.grade : undefined,
            department: row.department !== undefined ? rowData.department : undefined,
            skill: row.skill !== undefined ? rowData.skill : undefined,
            dateOfBirth: rowData.dateOfBirth,
            dateOfJoining: rowData.dateOfJoining,
            ...(row.pmeDate !== undefined ? { pmeDate: rowData.pmeDate, pmeExpiry: rowData.pmeExpiry } : {}),
            ...(row.vtcDate !== undefined ? { vtcDate: rowData.vtcDate, vtcExpiry: rowData.vtcExpiry } : {}),
            ...(row.medicalConditions !== undefined ? { medicalConditions: rowData.medicalConditions } : {}),
            ...(row.remark !== undefined ? { remark: rowData.remark } : {}),
            ...(row.relay !== undefined ? { relay: rowData.relay } : {}),
            employeeType: rowData.employeeType,
          };
          await tx.employee.update({
            where: { id: existing.id },
            data: updateData,
          });
          if (rowData.pmeDate && rowData.pmeExpiry && existing.pmeDate?.getTime() !== rowData.pmeDate.getTime()) {
            await tx.employeeCertification.create({ data: { employeeId: existing.id, type: "PME", date: rowData.pmeDate, dueDate: rowData.pmeExpiry } });
          }
          if (rowData.vtcDate && rowData.vtcExpiry && existing.vtcDate?.getTime() !== rowData.vtcDate.getTime()) {
            await tx.employeeCertification.create({ data: { employeeId: existing.id, type: "VTC", date: rowData.vtcDate, dueDate: rowData.vtcExpiry } });
          }
          results.updated += 1;
        } else {
          const created = await tx.employee.create({ data: rowData });
          const history = [];
          if (created.pmeDate && created.pmeExpiry) history.push({ employeeId: created.id, type: "PME" as const, date: created.pmeDate, dueDate: created.pmeExpiry });
          if (created.vtcDate && created.vtcExpiry) history.push({ employeeId: created.id, type: "VTC" as const, date: created.vtcDate, dueDate: created.vtcExpiry });
          if (history.length) await tx.employeeCertification.createMany({ data: history });
          results.added += 1;
        }
      }
    }, { timeout: 60_000 });
  } catch {
    return res.status(500).json({ error: "Failed to import employee master" });
  }

  return res.json({
    data: {
      total: rows.length,
      added: results.added,
      updated: results.updated,
      failed: results.failed,
    },
  });
}
