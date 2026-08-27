import { Router } from "express";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listShiftAllocations,
  getShiftAllocation,
  saveShiftAllocation,
  deleteShiftAllocation,
} from "@/controllers/shift-allocation.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listShiftAllocations);
router.get("/:id", getShiftAllocation);
router.post("/", requireRole("ADMIN", "SHIFT_INCHARGE"), saveShiftAllocation);
router.delete("/:id", requireRole("ADMIN", "SHIFT_INCHARGE"), deleteShiftAllocation);

export default router;
