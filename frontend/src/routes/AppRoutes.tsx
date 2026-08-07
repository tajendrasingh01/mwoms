import { Routes, Route } from "react-router-dom";

import { AppLayout } from "@/layouts/AppLayout";
import { LoginPage } from "@/pages/LoginPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { ShiftAllocationPage } from "@/pages/ShiftAllocationPage";
import { ShiftDiaryPage } from "@/pages/ShiftDiaryPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

/**
 * V1.0 routes. /login is public; everything else requires a session
 * (ProtectedRoute redirects to /login otherwise) and renders inside
 * the AppLayout shell. Per-page role restrictions (e.g. Admin-only
 * actions within Employee Master) use <RoleGuard> inside the page
 * itself rather than at the route level, since most pages are shared
 * across roles with only some actions restricted.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/shift-allocation" element={<ShiftAllocationPage />} />
          <Route path="/shift-diary" element={<ShiftDiaryPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
