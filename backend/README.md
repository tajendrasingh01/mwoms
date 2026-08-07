# MWOMS — Backend (Milestone 2 + 3: Authentication & Employee Master)

Node.js/Express + Prisma + PostgreSQL (Neon) backend for the Mine Workforce
Operations Management System.

## What's in this milestone

- Express app with CORS (credentialed) and session middleware
- Prisma ORM 7 schema with a `User` model (Employee ID, name, password hash, role, active flag)
- `prisma.config.ts` (Prisma 7 moved the CLI's database URL here, out of `schema.prisma`) and the `@prisma/adapter-pg` driver adapter the Prisma Client now requires
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `requireAuth` / `requireRole` middleware, ready to protect future routes
  (Employee Master, Shift Allocation, Shift Diary, Reports)
- Seed script that creates a starter Admin login
- `GET /api/health` for a quick liveness check
- **Employee Master**: `Employee` model (Employee ID, name, DOB, experience,
  designation, department, skill, DOJ, PME/VTC expiry, active status);
  `GET/POST/PUT/DELETE /api/employees` with search + pagination; reads
  available to all roles, writes (`POST`/`PUT`/`DELETE`) restricted to
  Admin; `DELETE` soft-deletes (sets `isActive: false`) rather than
  removing the row, since Shift Allocation/Diary will later reference
  employees by ID; age and PME/VTC "due soon/expired" status are computed
  at read time rather than stored, so they never go stale
- Seed script now also creates 3 sample employees (including one with a
  deliberately expired PME date, to exercise the status badges)

## Prerequisites

- Node.js 20+
- A Neon PostgreSQL database (free tier is fine) — https://neon.tech

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create your database**
Sign up at neon.tech, create a project, and copy the connection string
from the dashboard.

**3. Configure environment variables**
```bash
cp .env.example .env
```
Edit `.env` and set:
- `DATABASE_URL` — your Neon connection string
- `SESSION_SECRET` — generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `CORS_ORIGIN` — must exactly match your frontend's dev URL (e.g. the
  Codespaces forwarded URL for port 5173, or `http://localhost:5173` locally)

**4. Generate the Prisma client and create the database table**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

**5. Seed the first Admin login**
```bash
npm run prisma:seed
```
This creates a login with Employee ID `ADMIN001` and password
`ChangeMe123!` (or whatever you set `SEED_ADMIN_EMPLOYEE_ID` /
`SEED_ADMIN_PASSWORD` to in `.env`). **Change this password before any
real use.**

**6. Start the server**
```bash
npm run dev
```
The API will be running at `http://localhost:4000`. Test it:
```bash
curl http://localhost:4000/api/health
```

## Connecting the frontend

In `mwoms-frontend/.env.local`, set:
```
VITE_API_BASE_URL=http://localhost:4000/api
```
(or the Codespaces-forwarded URL for port 4000, if frontend and backend
are in the same Codespace — make sure that port's visibility is set to
match what CORS_ORIGIN expects).

## Scripts

```bash
npm run dev             # start with auto-reload (tsx watch)
npm run build           # type-check + compile to dist/
npm run start           # run the compiled build
npm run lint            # ESLint
npm run prisma:generate # regenerate the Prisma client after schema changes
npm run prisma:migrate  # create/apply a migration
npm run prisma:seed     # re-run the seed script
npm run prisma:studio   # visual database browser
```

## Upgrading from Milestone 2

The Prisma schema gained a new `Employee` model in this milestone. If
your database already exists from Milestone 2 (Authentication only),
run a fresh migration to add the `employees` table:

```bash
npx prisma migrate dev --name add_employee_master
npm run prisma:seed   # safe to re-run — uses upsert, won't duplicate data
```

## Before deploying to Render

The session store currently defaults to Express's in-memory store, which
is fine for local development only — it loses all sessions on restart
and won't work across multiple instances. `connect-pg-simple` is already
installed; before deploying, wire it up in `src/index.ts` pointed at the
same Neon database so sessions persist properly.

## Next milestones (not in this delivery)

Shift Allocation, Shift Diary, Dashboard live data, Reports.
