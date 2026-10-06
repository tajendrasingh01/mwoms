import type { Request, Response } from "express";
import { getOneDriveStatus, syncOneDriveFiles } from "@/services/onedrive-sync.service";

export function oneDriveStatus(_req: Request, res: Response) {
  return res.json({ data: getOneDriveStatus() });
}

export async function syncOneDrive(_req: Request, res: Response) {
  try { return res.json({ data: await syncOneDriveFiles() }); }
  catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : "OneDrive sync failed" }); }
}