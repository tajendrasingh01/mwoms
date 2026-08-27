import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from "@azure/msal-node";

import { env } from "@/config/env";
import { prisma } from "@/lib/prisma";
import { parseWorksheetRows, rowToEmployeeData, validateParsedRows } from "@/controllers/employee.import.controller";

const SCOPES = ["Files.Read", "User.Read", "offline_access"];
const CACHE_FILE = path.resolve(process.cwd(), ".data/onedrive-msal-cache.json");

type SyncStatus = {
  configured: boolean;
  connected: boolean;
  pendingLogin: { userCode: string; verificationUri: string; expiresIn: number } | null;
  lastSyncAt: string | null;
  lastResult: { added: number; updated: number; skipped: number; errors: number } | null;
  lastError: string | null;
};

const status: SyncStatus = {
  configured: !!env.ONEDRIVE_CLIENT_ID,
  connected: false,
  pendingLogin: null,
  lastSyncAt: null,
  lastResult: null,
  lastError: null,
};

let msal: PublicClientApplication | null = null;
let loginPromise: Promise<AuthenticationResult | null> | null = null;

async function createMsal() {
  if (!env.ONEDRIVE_CLIENT_ID) return null;
  if (!msal) {
    const cache = await fs.readFile(CACHE_FILE, "utf8").catch(() => "");
    msal = new PublicClientApplication({
      auth: { clientId: env.ONEDRIVE_CLIENT_ID, authority: `https://login.microsoftonline.com/${env.ONEDRIVE_TENANT_ID}` },
      cache: { cachePlugin: { beforeCacheAccess: async (context) => { context.tokenCache.deserialize(cache); }, afterCacheAccess: async (context) => { if (context.cacheHasChanged) { await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true }); await fs.writeFile(CACHE_FILE, context.tokenCache.serialize(), "utf8"); } } } },
    });
  }
  return msal;
}

export function getOneDriveStatus(): SyncStatus {
  return { ...status };
}

export async function beginOneDriveLogin() {
  const client = await createMsal();
  if (!client) throw new Error("ONEDRIVE_CLIENT_ID is not configured");
  if (loginPromise) return status.pendingLogin;
  loginPromise = client.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      status.pendingLogin = { userCode: response.userCode, verificationUri: response.verificationUri, expiresIn: response.expiresIn }; 
    },
  }).then((result) => { status.connected = !!result; status.pendingLogin = null; return result; }).catch((error) => { status.lastError = error instanceof Error ? error.message : "OneDrive login failed"; status.pendingLogin = null; return null; }).finally(() => { loginPromise = null; });
  await new Promise((resolve) => setImmediate(resolve));
  return status.pendingLogin;
}

async function accessToken(): Promise<string> {
  const client = await createMsal();
  if (!client) throw new Error("OneDrive is not configured. Set ONEDRIVE_CLIENT_ID first.");
  if (loginPromise) await loginPromise;
  const account: AccountInfo | null = (await client.getTokenCache().getAllAccounts())[0] ?? null;
  if (!account) throw new Error("Connect OneDrive before syncing.");
  const result = await client.acquireTokenSilent({ account, scopes: SCOPES });
  if (!result?.accessToken) throw new Error("Unable to obtain a OneDrive access token.");
  status.connected = true;
  return result.accessToken;
}

async function downloadWorkbook(fileName: string): Promise<Buffer> {
  const token = await accessToken();
  const filePath = [env.ONEDRIVE_FOLDER_PATH, fileName].filter(Boolean).join("/").split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${filePath}:/content`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`OneDrive could not read ${fileName} (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}

async function importWorkbook(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Workbook has no worksheet");
  const rows = parseWorksheetRows(sheet);
  const errors = validateParsedRows(rows);
  const invalidRows = new Set(errors.map((error) => error.row));
  const validRows = rows.filter((row) => !invalidRows.has(row.rowIndex));
  let added = 0;
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const row of validRows) {
      const data = rowToEmployeeData(row);
      const existing = await tx.employee.findUnique({ where: { employeeId: data.employeeId }, select: { id: true } });
      if (existing) { await tx.employee.update({ where: { id: existing.id }, data }); updated += 1; }
      else { await tx.employee.create({ data }); added += 1; }
    }
  }, { timeout: 60_000 });
  return { added, updated, skipped: invalidRows.size, errors: errors.length };
}

export async function syncOneDriveFiles() {
  const results = [];
  for (const fileName of [env.ONEDRIVE_DR_FILE, env.ONEDRIVE_MR_FILE]) {
    results.push(await importWorkbook(await downloadWorkbook(fileName)));
  }
  const result = results.reduce((total, current) => ({ added: total.added + current.added, updated: total.updated + current.updated, skipped: total.skipped + current.skipped, errors: total.errors + current.errors }), { added: 0, updated: 0, skipped: 0, errors: 0 });
  status.lastSyncAt = new Date().toISOString();
  status.lastResult = result;
  status.lastError = null;
  return result;
}

export function startOneDriveSync() {
  if (!env.ONEDRIVE_CLIENT_ID || env.ONEDRIVE_SYNC_INTERVAL_MINUTES <= 0) return;
  setInterval(() => { void syncOneDriveFiles().catch((error) => { status.lastError = error instanceof Error ? error.message : "OneDrive sync failed"; }); }, env.ONEDRIVE_SYNC_INTERVAL_MINUTES * 60_000);
}