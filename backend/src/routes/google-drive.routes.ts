import { Router } from "express";
import { requireRole } from "@/middleware/auth.middleware";
import { correctGoogleDriveRow, googleDriveStatus, previewGoogleDrive, syncGoogleDrive } from "@/controllers/google-drive.controller";

const router = Router();
router.get("/status", requireRole("ADMIN"), googleDriveStatus);
router.get("/preview", requireRole("ADMIN"), previewGoogleDrive);
router.put("/correction", requireRole("ADMIN"), correctGoogleDriveRow);
router.post("/sync", requireRole("ADMIN"), syncGoogleDrive);
export default router;