import { Router } from "express";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listShiftInChargeUsers,
  listUsers,
  createUser,
} from "@/controllers/user.controller";

const router = Router();

router.use(requireAuth);

router.get("/shift-incharges", listShiftInChargeUsers);
router.get("/", requireRole("ADMIN"), listUsers);
router.post("/", requireRole("ADMIN"), createUser);

export default router;
