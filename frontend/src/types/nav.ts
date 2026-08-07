import type { LucideIcon } from "lucide-react";

/** Roles supported in V1.0 (Authentication milestone will enforce this). */
export type UserRole = "ADMIN" | "SHIFT_INCHARGE" | "VIEWER";

export interface NavItem {
  /** Unique key, also used for the React list key. */
  key: string;
  /** Label shown in the sidebar. */
  label: string;
  /** Route path, relative to the app root. */
  path: string;
  /** Icon component from lucide-react. */
  icon: LucideIcon;
  /** Roles allowed to see this nav item. Omit to allow all roles. */
  roles?: UserRole[];
}

export interface NavSection {
  key: string;
  title?: string;
  items: NavItem[];
}
