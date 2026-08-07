import { Router } from "express";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listShiftAllocations,
  getShiftAllocation,
  saveShiftAllocation,
} from "@/controllers/shift-allocation.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listShiftAllocations);
router.get("/:id", getShiftAllocation);
router.post("/", requireRole("ADMIN", "SHIFT_INCHARGE"), saveShiftAllocation);

export default router;
