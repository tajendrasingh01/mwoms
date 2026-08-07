# MWOMS — Frontend (Milestones 1–4: Foundation, Auth, Employee Master & Shift Allocation)

Mine Workforce Operations Management System — frontend application shell.

## Stack

React 19 · Vite 8 · TypeScript · Tailwind CSS v4 · shadcn/ui · React Router ·
TanStack Query · Axios · React Hook Form · Zod · Lucide React · ESLint

## What's in this milestone

- Project scaffolding, path aliases (`@/*` → `src/*`)
- Tailwind v4 theme tokens matching the MWOMS brand (deep blue / coal grey /
  status colors), light + dark mode
- Hand-built shadcn/ui primitives: Button, Card, Badge, Separator, Avatar,
  Tooltip, Sheet, DropdownMenu, Skeleton, Input, Label
- Enterprise folder architecture (`components/`, `layouts/`, `pages/`,
  `routes/`, `hooks/`, `services/`, `store/`, `types/`, `constants/`,
  `utils/`, `lib/`, `assets/`)
- Application shell: collapsible desktop Sidebar + mobile Sheet drawer,
  Header with real logged-in user + sign-out, routed content area
- Dashboard page with the six V1.0 KPI tiles (Current Shift, Total
  Employees, Allocated Employees, PME Due, VTC Due, Vacant Positions)
- Placeholder pages for Employee Master, Shift Allocation, Shift Diary,
  Reports (wired into routing, ready to be built out in later milestones)
- **Authentication**: Login page (Employee ID + password, React Hook Form +
  Zod), `AuthProvider`/`useAuth` (TanStack Query-backed session bootstrap +
  login/logout mutations), `ProtectedRoute` (redirects to `/login`),
  `RoleGuard` (for role-restricted actions within a page)
- Axios client + TanStack Query client, pre-configured for the
  Express/Prisma backend, with `withCredentials: true` for session cookies
- ESLint (flat config) with TypeScript + React Hooks + React Refresh rules
- **Employee Master**: searchable (debounced), paginated employee table
  with PME/VTC expiry status badges; Add/Edit dialog form (React Hook
  Form + Zod) restricted to the Admin role; TanStack Query hooks for
  list/create/update/deactivate with automatic cache invalidation; new
  shadcn/ui Table and Dialog primitives
- **Shift Allocation**: fixed 4-shift schedule (General 6am-2pm, 1st
  11am-7pm, 2nd 4pm-12am, 3rd/night 11pm-7am); date-scoped view of all
  four shifts with district/panel rosters; create/edit dialog with
  employee search-and-add, per-employee "authorized work" notes, and a
  hard confirmation popup before assigning anyone with an EXPIRED
  PME/VTC; new shadcn/ui Select primitive
- **Notification bell** in the header: near-expiry/expired PME & VTC
  alerts, scoped to "everyone" for Admin and "my assigned crew only"
  for Shift In-Charge, polling every 5 minutes
- **Dashboard**: KPI tiles now wired to real data (current active
  shift, total/allocated employees, PME/VTC due counts); Admin and
  Shift In-Charge also see a "Shift-wise Personnel Deployed" section —
  the manager view of who's on each shift, their authorized work, and
  PME/VTC status, for any selected date

## Getting started

```bash
npm install
cp .env.example .env.local   # set VITE_API_BASE_URL to your backend's URL
npm run dev                  # http://localhost:5173
```

You'll need the `mwoms-backend` project running too (see its README) —
the login page won't work without it.

Other scripts:

```bash
npm run build     # type-check (tsc -b) + production build
npm run preview   # preview the production build locally
npm run lint       # ESLint
```

## Folder guide

| Folder | Purpose |
|---|---|
| `src/components/ui` | Low-level shadcn/ui primitives (don't add business logic here) |
| `src/components/layout` | Sidebar, Header — the app shell chrome |
| `src/components/common` | Shared building blocks used across pages (KpiCard, ComingSoon) |
| `src/layouts` | Route-level layout wrappers (`AppLayout`) |
| `src/pages` | One file per route/screen |
| `src/routes` | Route table + guards (`AppRoutes`, `ProtectedRoute`, `RoleGuard`) |
| `src/hooks` | Reusable React hooks |
| `src/services` | API clients / data-fetching functions |
| `src/store` | Cross-cutting client state — UI (`ui-store`) and auth session (`auth-store`) |
| `src/types` | Shared TypeScript types |
| `src/constants` | Static config (nav items, enums, etc.) |
| `src/lib` | Framework glue (query client, `cn()` utility) |

## Next milestones (not in this delivery)

Shift Diary, Reports.

## Known limitation

The `npm audit` advisory for `react-router` (RSC-mode CSRF bypass)
does not apply here — this app uses plain client-side `BrowserRouter`
with no server actions/RSC, so that code path is never exercised.
Force-downgrading to "fix" it would revert the React Router 7→8
upgrade for no real benefit; left as-is intentionally.
