import type { Request, Response } from "express";
import { getGoogleDriveStatus, syncGoogleDriveEmployeeMaster } from "@/services/google-drive-sync.service";

export function googleDriveStatus(_req: Request, res: Response) {
  return res.json({ data: getGoogleDriveStatus() });
}

export async function syncGoogleDrive(_req: Request, res: Response) {
  try { return res.json({ data: await syncGoogleDriveEmployeeMaster() }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "Google Drive sync failed" }); }
}