import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";

import type { UserRole } from "@/types/nav";
import { useAuth } from "@/store/auth-store";
import { Card, CardContent } from "@/components/ui/card";

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

/**
 * Use inside an already-authenticated route tree (nest under
 * ProtectedRoute) to further restrict a page to specific roles, e.g.
 * <RoleGuard allowedRoles={["ADMIN"]}> around Employee Master edits.
 */
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
            <ShieldAlert className="size-6" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your role doesn't have permission to view this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
