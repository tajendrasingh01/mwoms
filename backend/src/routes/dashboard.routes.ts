import { Router } from "express";

import { requireAuth } from "@/middleware/auth.middleware";
import { getComplianceEmployees, getDashboardSummary, getShiftOverview } from "@/controllers/dashboard.controller";

const router = Router();

router.use(requireAuth);
router.get("/summary", getDashboardSummary);
router.get("/compliance/:type", getComplianceEmployees);
router.get("/shift-overview", getShiftOverview);

export default router;
