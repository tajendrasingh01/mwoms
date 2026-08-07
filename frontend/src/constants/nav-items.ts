import {
  LayoutDashboard,
  Users,
  CalendarClock,
  NotebookPen,
  FileBarChart,
} from "lucide-react";

import type { NavSection } from "@/types/nav";

/**
 * Primary sidebar navigation for MWOMS V1.0.
 * Grouped into sections so future milestones (Employee Master, Shift
 * Allocation, Shift Diary, Reports) can be added without restructuring
 * the sidebar component itself.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "overview",
    items: [
      {
        key: "dashboard",
        label: "Dashboard",
        path: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    key: "workforce",
    title: "Workforce",
    items: [
      {
        key: "employees",
        label: "Employee Master",
        path: "/employees",
        icon: Users,
      },
      {
        key: "shift-allocation",
        label: "Shift Allocation",
        path: "/shift-allocation",
        icon: CalendarClock,
      },
      {
        key: "shift-diary",
        label: "Shift Diary",
        path: "/shift-diary",
        icon: NotebookPen,
      },
    ],
  },
  {
    key: "insights",
    title: "Insights",
    items: [
      {
        key: "reports",
        label: "Reports",
        path: "/reports",
        icon: FileBarChart,
      },
    ],
  },
];
