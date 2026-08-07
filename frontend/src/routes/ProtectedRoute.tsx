import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/store/auth-store";

/**
 * Wrap any route tree that requires an authenticated session. While
 * the initial session check is in flight, renders a full-screen
 * loading state instead of flashing the login page then redirecting
 * (which is a jarring, common auth-guard bug).
 */
export function ProtectedRoute() {
  const { user, isLoadingSession } = useAuth();
  const location = useLocation();

  if (isLoadingSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
