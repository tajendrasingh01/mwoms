import { Router } from "express";

import { requireAuth } from "@/middleware/auth.middleware";
import { getDashboardSummary, getShiftOverview } from "@/controllers/dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/summary", getDashboardSummary);
router.get("/shift-overview", getShiftOverview);

export default router;
