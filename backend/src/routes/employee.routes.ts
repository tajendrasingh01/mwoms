import { Router, type Request } from "express";
import multer from "multer";

import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
} from "@/controllers/employee.controller";
import {
  downloadEmployeeTemplate,
  previewEmployeeImport,
  importEmployeeMaster,
} from "@/controllers/employee.import.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
    const allowedExtensions = [".xlsx", ".xls", ".csv"];
    const extension = file.originalname.slice(file.originalname.lastIndexOf(".")).toLowerCase();
    if (allowedExtensions.includes(extension)) {
      return cb(null, true);
    }
    return cb(new Error("Unsupported file type. Use XLSX, XLS or CSV."));
  },
});

const router = Router();

// All Employee Master routes require a session. Reads are available
// to every role (Admin, Shift In-Charge, Viewer); writes are Admin-only
// per the V1.0 role spec.
router.use(requireAuth);

router.get("/", listEmployees);
router.get("/template", downloadEmployeeTemplate);
router.post(
  "/import/preview",
  requireRole("ADMIN"),
  upload.single("file"),
  previewEmployeeImport,
);
router.post(
  "/import",
  requireRole("ADMIN"),
  upload.single("file"),
  importEmployeeMaster,
);
router.get("/:id", getEmployee);
router.post("/", requireRole("ADMIN"), createEmployee);
router.put("/:id", requireRole("ADMIN"), updateEmployee);
router.delete("/:id", requireRole("ADMIN"), deactivateEmployee);

export default router;
