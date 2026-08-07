import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Neon connection string)"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 characters"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Codespaces serves the frontend and backend on different HTTPS
  // subdomains, which browsers treat as cross-site — that requires
  // sameSite: "none" + secure: true or the session cookie won't be
  // sent back on API requests. Plain http://localhost (frontend and
  // backend both on your own machine, no Codespaces) needs the
  // opposite: sameSite "lax" and secure false, since "none" cookies
  // are rejected entirely over plain HTTP. Defaults below assume
  // Codespaces/HTTPS; override in .env for local-only development.
  SESSION_COOKIE_SECURE: z.coerce.boolean().default(true),
  SESSION_COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).default("none"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables — see errors above.");
}

export const env = parsed.data;
