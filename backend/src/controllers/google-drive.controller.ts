import type { Request, Response } from "express";
import { correctGoogleDriveEmployeeRow, getGoogleDriveStatus, previewGoogleDriveEmployeeMaster, syncGoogleDriveEmployeeMaster } from "@/services/google-drive-sync.service";

export function googleDriveStatus(_req: Request, res: Response) {
  return res.json({ data: getGoogleDriveStatus() });
}

export async function syncGoogleDrive(_req: Request, res: Response) {
  try { return res.json({ data: await syncGoogleDriveEmployeeMaster() }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Google Drive sync failed" }); }
}

export async function previewGoogleDrive(_req: Request, res: Response) {
  const requestedSheet = typeof _req.query.sheet === "string" ? _req.query.sheet : undefined;
  const employeeId = typeof _req.query.employeeId === "string" ? _req.query.employeeId : undefined;
  try { return res.json({ data: await previewGoogleDriveEmployeeMaster(requestedSheet, employeeId) }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Google Drive preview failed" }); }
}

export async function correctGoogleDriveRow(req: Request, res: Response) {
  try {
    return res.json({ data: await correctGoogleDriveEmployeeRow({
      sheetName: req.body?.sheetName,
      sourceRow: Number(req.body?.sourceRow),
      values: req.body?.values,
    }) });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : "Could not save employee correction" });
  }
}