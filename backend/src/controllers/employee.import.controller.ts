import type { Request, Response } from "express";
import XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import { calculatePmeDueDate, calculateVtcDueDate } from "@/lib/employee-utils";

type MulterRequest = Request & { file?: Express.Multer.File };

const HEADER_TO_FIELD: Record<string, string> = {
  "eis no": "employeeId",
  "eis number": "employeeId",
  "eis": "employeeId",
  "employee id": "employeeId",
  "employee no": "employeeId",
  "employee number": "employeeId",
  "emp id": "employeeId",
  "emp no": "employeeId",
  "personnel no": "employeeId",
  "personnel number": "employeeId",
  "staff id": "employeeId",
  name: "name",
  "employee name": "name",
  "name of employee": "name",
  "worker name": "name",
  "father name": "fatherName",
  "father s name": "fatherName",
  "fathers name": "fatherName",
  designation: "designation",
  "job title": "designation",
  "post held": "designation",
  grade: "grade",
  "pay grade": "grade",
  department: "department",
  dept: "department",
  skill: "skill",
  trade: "skill",
  dob: "dateOfBirth",
  "date of birth": "dateOfBirth",
  "birth date": "dateOfBirth",
  birthday: "dateOfBirth",
  doa: "dateOfJoining",
  "date of joining": "dateOfJoining",
  doj: "dateOfJoining",
  "joining date": "dateOfJoining",
  "date joined": "dateOfJoining",
  "date of appointment": "dateOfJoining",
  pme: "pmeDate",
  "pme date": "pmeDate",
  "medical date": "pmeDate",
  "last medical": "pmeDate",
  vtc: "vtcDate",
  "vtc date": "vtcDate",
  "training date": "vtcDate",
  age: "age",
  "due pme": "duePme",
  "pme due": "duePme",
  "pme expiry date": "pmeExpiry",
  "left days pme": "leftDaysPme",
  "expiry pme": "pmeExpiry",
  "pme expiry": "pmeExpiry",
  "due vtc": "dueVtc",
  "vtc due": "dueVtc",
  "vtc expiry date": "vtcExpiry",
  "left days vtc": "leftDaysVtc",
  "expiry vtc": "vtcExpiry",
  "vtc expiry": "vtcExpiry",
  "medical conditions": "medicalConditions",
  "medical condition": "medicalConditions",
  "health conditions": "medicalConditions",
  remark: "remark",
  remarks: "remark",
  comments: "remark",
  relay: "relay",
  shift: "relay",
  "employee type": "employeeType",
};

const REQUIRED_HEADERS = ["eis no", "name", "designation", "dob", "doa"];
const REQUIRED_HEADER_ALIASES: Record<string, string[]> = {
  "eis no": ["eis no", "eis number", "eis", "employee id", "employee no", "employee number", "emp id", "emp no", "personnel no", "personnel number", "staff id"],
  name: ["name", "employee name", "name of employee", "worker name"],
  designation: ["designation", "job title", "post held"],
  dob: ["dob", "date of birth", "birth date", "birthday"],
  doa: ["doa", "date of joining", "doj", "joining date", "date joined", "date of appointment"],
};

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
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cellToText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text || undefined;
}

const RELAY_DISPLAY_TO_INTERNAL: Record<string, "RELAY_A" | "RELAY_B" | "RELAY_C"> = {
  "relay a": "RELAY_A",
  "relay b": "RELAY_B",
  "relay c": "RELAY_C",
};

function parseExcelRelay(value: unknown): "RELAY_A" | "RELAY_B" | "RELAY_C" | undefined {
  const normalized = cellToText(value)?.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!normalized) return undefined;
  const relay = normalized.match(/(?:relay )?([abc])(?: relay)?$/);
  if (relay) return `RELAY_${relay[1].toUpperCase()}` as "RELAY_A" | "RELAY_B" | "RELAY_C";
  return RELAY_DISPLAY_TO_INTERNAL[normalized];
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
  if (/^\d{5}(?:\.\d+)?$/.test(trimmed)) {
    return parseExcelDate(Number(trimmed));
  }
  const components = trimmed.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})$/);
  if (components) {
    const [, firstPart, secondPart, thirdPart] = components;
    const first = Number(firstPart);
    const second = Number(secondPart);
    const third = Number(thirdPart);
    const yearFirst = firstPart.length === 4;
    let year = yearFirst ? first : third;
    if (!yearFirst && year < 100) year += year >= 50 ? 1900 : 2000;
    const monthFirst = !yearFirst && first <= 12 && second > 12;
    const day = yearFirst ? third : monthFirst ? second : first;
    const month = (yearFirst ? second : monthFirst ? first : second) - 1;
    const parsed = new Date(year, month, day);
    return parsed.getFullYear() === year && parsed.getMonth() === month && parsed.getDate() === day ? parsed : null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseWorksheetRows(sheet: XLSX.WorkSheet, options: { surfaceWorkbook?: boolean; employeeType?: ParsedEmployeeRow["employeeType"] } = {}): ParsedEmployeeRow[] {
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  if (rawRows.length === 0) {
    return [];
  }

  let headerRowIndex = 0;
  let bestHeaderScore = -1;
  for (let rowIndex = 0; rowIndex < Math.min(rawRows.length, 30); rowIndex += 1) {
    const candidate = rawRows[rowIndex];
    if (!Array.isArray(candidate)) continue;
    const keys = candidate.map(normalizeHeader);
    const recognizedFields = new Set(keys.map((key) => HEADER_TO_FIELD[key]).filter(Boolean));
    const hasEmployeeId = REQUIRED_HEADER_ALIASES["eis no"].some((alias) => keys.includes(alias));
    const hasName = REQUIRED_HEADER_ALIASES.name.some((alias) => keys.includes(alias));
    const score = recognizedFields.size + (hasEmployeeId ? 10 : 0) + (hasName ? 10 : 0);
    if (hasEmployeeId && hasName && score > bestHeaderScore) {
      headerRowIndex = rowIndex;
      bestHeaderScore = score;
    }
  }

  const headersRow = rawRows[headerRowIndex];
  if (!Array.isArray(headersRow)) {
    throw new Error("Could not find a valid header row. Include employee ID and name columns.");
  }
  const headerKeys = headersRow.map(normalizeHeader);
  const isMonthlyRated = headerKeys.includes("grade") && !headerKeys.includes("vtc");

  for (const required of REQUIRED_HEADERS) {
    if (!REQUIRED_HEADER_ALIASES[required].some((alias) => headerKeys.includes(alias))) {
      throw new Error(`Missing required column: ${required}`);
    }
  }

  const fieldIndexes = headerKeys.reduce<Record<number, string>>((acc, header, index) => {
    if (HEADER_TO_FIELD[header]) {
      acc[index] = HEADER_TO_FIELD[header];
    }
    return acc;
  }, {});

  return rawRows.slice(headerRowIndex + 1).filter((rawRow) => Array.isArray(rawRow) && rawRow.some((value) => value !== null && String(value).trim() !== "")).map((rawRow: unknown[], dataIndex: number) => {
    const parsedRow: ParsedEmployeeRow = { rowIndex: headerRowIndex + dataIndex + 2 };
    rawRow.forEach((cellValue, columnIndex) => {
      const field = fieldIndexes[columnIndex];
      if (!field) return;
      const trimmed = typeof cellValue === "string" ? cellValue.trim() : cellValue;
      switch (field) {
        case "employeeId":
          parsedRow.employeeId = trimmed !== null && trimmed !== undefined ? String(trimmed).trim() || undefined : undefined;
          break;
        case "name":
          parsedRow.name = cellToText(trimmed);
          break;
        case "employeeType":
          parsedRow.employeeType = parseExcelEmployeeType(trimmed);
          break;
        case "fatherName":
          parsedRow.fatherName = cellToText(trimmed);
          break;
        case "designation":
          parsedRow.designation = cellToText(trimmed);
          break;
        case "grade":
          parsedRow.grade = trimmed === null || trimmed === undefined ? null : String(trimmed).trim() || null;
          break;
        case "department":
          parsedRow.department = cellToText(trimmed);
          break;
        case "skill":
          parsedRow.skill = cellToText(trimmed);
          break;
        case "dateOfBirth":
          parsedRow.dateOfBirth = parseExcelDate(trimmed) ?? undefined;
          break;
        case "dateOfJoining":
          parsedRow.dateOfJoining = parseExcelDate(trimmed) ?? undefined;
          break;
        case "pmeDate":
          parsedRow.pmeDate = parseExcelDate(trimmed);
          break;
        case "pmeExpiry":
          parsedRow.pmeExpiry = parseExcelDate(trimmed);
          break;
        case "duePme":
          parsedRow.pmeExpiry = parseExcelDate(trimmed);
          break;
        case "vtcDate":
          parsedRow.vtcDate = parseExcelDate(trimmed);
          break;
        case "vtcExpiry":
          parsedRow.vtcExpiry = parseExcelDate(trimmed);
          break;
        case "dueVtc":
          parsedRow.vtcExpiry = parseExcelDate(trimmed);
          break;
        case "medicalConditions":
          parsedRow.medicalConditions = cellToText(trimmed);
          break;
        case "remark":
          parsedRow.remark = cellToText(trimmed);
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
    parsedRow.employeeType = options.employeeType ?? (options.surfaceWorkbook ? "SURFACE_DR" : parsedRow.employeeType ?? (isMonthlyRated ? "MONTHLY_RATED" : "DAILY_RATED"));
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
