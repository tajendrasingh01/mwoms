import { Router } from "express";

import { requireAuth } from "@/middleware/auth.middleware";
import { getNotifications } from "@/controllers/notification.controller";

const router = Router();

router.use(requireAuth);
router.get("/", getNotifications);

export default router;
