import { Outlet, useLocation } from "react-router-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAV_SECTIONS } from "@/constants/nav-items";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/ui-store";

function usePageTitle(pathname: string): string {
  for (const section of NAV_SECTIONS) {
    const match = section.items.find(
      (item) => item.path === pathname || (item.path !== "/" && pathname.startsWith(item.path)),
    );
    if (match) return match.label;
  }
  return "MWOMS";
}

export function AppLayout() {
  const { isSidebarCollapsed, isMobileNavOpen, setMobileNavOpen } = useUiStore();
  const location = useLocation();
  const pageTitle = usePageTitle(location.pathname);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-sidebar-border transition-[width] duration-200 lg:block",
          isSidebarCollapsed ? "w-16" : "w-64",
        )}
      >
        <Sidebar variant="rail" />
      </aside>

      {/* Mobile sidebar (slide-over) */}
      <Sheet open={isMobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar variant="sheet" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header title={pageTitle} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
