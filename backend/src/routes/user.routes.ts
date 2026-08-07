import { Router } from "express";

import { requireAuth } from "@/middleware/auth.middleware";
import { listShiftInChargeUsers } from "@/controllers/user.controller";

const router = Router();

router.use(requireAuth);

router.get("/shift-incharges", listShiftInChargeUsers);

export default router;
