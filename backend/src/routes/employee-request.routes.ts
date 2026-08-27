import { Router } from "express";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  createEmployeeRequest,
  listEmployeeRequests,
  reviewEmployeeRequest,
} from "@/controllers/employee-request.controller";

const router = Router();

router.use(requireAuth);

router.get("/", requireRole("ADMIN"), listEmployeeRequests);
router.post("/", requireRole("SHIFT_INCHARGE"), createEmployeeRequest);
router.post("/review", requireRole("ADMIN"), reviewEmployeeRequest);

export default router;
