import type { Request, Response } from "express";
import { getGoogleDriveStatus, previewGoogleDriveEmployeeMaster, syncGoogleDriveEmployeeMaster } from "@/services/google-drive-sync.service";

export function googleDriveStatus(_req: Request, res: Response) {
  return res.json({ data: getGoogleDriveStatus() });
}

export async function syncGoogleDrive(_req: Request, res: Response) {
  try { return res.json({ data: await syncGoogleDriveEmployeeMaster() }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Google Drive sync failed" }); }
}

export async function previewGoogleDrive(_req: Request, res: Response) {
  const requestedSheet = typeof _req.query.sheet === "string" ? _req.query.sheet : undefined;
  try { return res.json({ data: await previewGoogleDriveEmployeeMaster(requestedSheet) }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Google Drive preview failed" }); }
}