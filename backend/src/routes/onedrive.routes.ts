import { Router } from "express";
import { requireRole } from "@/middleware/auth.middleware";
import { connectOneDrive, oneDriveStatus, syncOneDrive } from "@/controllers/onedrive.controller";

const router = Router();
router.get("/status", requireRole("ADMIN"), oneDriveStatus);
router.post("/connect", requireRole("ADMIN"), connectOneDrive);
router.post("/sync", requireRole("ADMIN"), syncOneDrive);
export default router;