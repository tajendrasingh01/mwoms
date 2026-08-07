import * as React from "react";
import { createContext, useContext, useMemo, useState } from "react";

interface UiState {
  /** Desktop sidebar collapsed to icon-only rail. */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Mobile sidebar (Sheet) open/closed. */
  isMobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

const UiContext = createContext<UiState | null>(null);

/**
 * App-wide UI state that isn't server data (server state belongs in
 * TanStack Query) and isn't complex enough to justify a dedicated
 * state-management library yet. As V1.0 grows (e.g. shift-allocation
 * filters, saved report views) this is the place to add more slices,
 * or to swap the implementation for Zustand/Redux without touching
 * consuming components.
 */
export function UiStoreProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setMobileNavOpen] = useState(false);

  const value = useMemo<UiState>(
    () => ({
      isSidebarCollapsed,
      toggleSidebar: () => setIsSidebarCollapsed((prev) => !prev),
      isMobileNavOpen,
      setMobileNavOpen,
    }),
    [isSidebarCollapsed, isMobileNavOpen],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUiStore(): UiState {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error("useUiStore must be used within a UiStoreProvider");
  }
  return ctx;
}
