import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";

import { env } from "@/config/env";
import authRoutes from "@/routes/auth.routes";
import employeeRoutes from "@/routes/employee.routes";
import shiftAllocationRoutes from "@/routes/shift-allocation.routes";
import userRoutes from "@/routes/user.routes";
import notificationRoutes from "@/routes/notification.routes";
import dashboardRoutes from "@/routes/dashboard.routes";
import oneDriveRoutes from "@/routes/onedrive.routes";
import { startOneDriveSync } from "@/services/onedrive-sync.service";

const app = express();

// Required for secure cookies to work correctly behind Codespaces'
// (or any) reverse proxy — without this, Express can't tell the
// original request was HTTPS.
app.set("trust proxy", 1);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true, // required so the browser sends/receives the session cookie
  }),
);
app.use(express.json());

const PgSession = connectPgSimple(session);
const sessionPool = new Pool({ connectionString: env.DATABASE_URL });

app.use(
  session({
    store: env.NODE_ENV === "production"
      ? new PgSession({ pool: sessionPool, tableName: "user_sessions", createTableIfMissing: true })
      : undefined,
    name: "mwoms.sid",
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.SESSION_COOKIE_SECURE,
      sameSite: env.SESSION_COOKIE_SAMESITE,
      maxAge: 1000 * 60 * 60 * 8, // 8 hours — matches a mine shift
    },
  }),
);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/shift-allocations", shiftAllocationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/onedrive", oneDriveRoutes);

if (env.NODE_ENV === "production") {
  const frontendDist = path.resolve(__dirname, "../../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.PORT, () => {
  console.log(`MWOMS backend listening on http://localhost:${env.PORT}`);
  startOneDriveSync();
});
