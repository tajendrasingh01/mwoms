import { Router } from "express";
import { requireRole } from "@/middleware/auth.middleware";
import { googleDriveStatus, syncGoogleDrive } from "@/controllers/google-drive.controller";

const router = Router();
router.get("/status", requireRole("ADMIN"), googleDriveStatus);
router.post("/sync", requireRole("ADMIN"), syncGoogleDrive);
export default router;