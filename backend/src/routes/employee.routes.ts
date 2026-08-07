import { Router } from "express";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} from "@/controllers/employee.controller";

const router = Router();

// All Employee Master routes require a session. Reads are available
// to every role (Admin, Shift In-Charge, Viewer); writes are Admin-only
// per the V1.0 role spec.
router.use(requireAuth);

router.get("/", listEmployees);
router.get("/:id", getEmployee);
router.post("/", requireRole("ADMIN"), createEmployee);
router.put("/:id", requireRole("ADMIN"), updateEmployee);
router.delete("/:id", requireRole("ADMIN"), deactivateEmployee);

export default router;
