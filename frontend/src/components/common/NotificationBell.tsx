import { Bell, AlertTriangle, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell() {
  const { data: notifications = [] } = useNotifications();
  const expiredCount = notifications.filter((n) => n.status === "EXPIRED").length;
  const hasAlerts = notifications.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-4.5" />
          {hasAlerts && (
            <span
              className={`absolute right-1.5 top-1.5 size-2 rounded-full ${
                expiredCount > 0 ? "bg-danger" : "bg-warning"
              }`}
            />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>PME / VTC Alerts</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">
            No expiry alerts right now.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={`${n.employeeDbId}-${n.type}`}
                className="flex items-start gap-2 px-2 py-2 text-sm"
              >
                {n.status === "EXPIRED" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
                ) : (
                  <Clock className="mt-0.5 size-4 shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">
                    {n.name} <span className="text-xs font-normal text-muted-foreground">({n.employeeId})</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{n.designation}</p>
                </div>
                <Badge variant={n.status === "EXPIRED" ? "danger" : "warning"} className="shrink-0">
                  {n.type} {n.status === "EXPIRED" ? "expired" : `${n.daysLeft}d left`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
