import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "@/config/env";

/**
 * Prisma ORM 7 requires an explicit driver adapter for every database
 * (this changed from v6, where a plain `new PrismaClient()` sufficed).
 * PrismaPg wraps the standard `pg` driver.
 */
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

declare global {
  var __prisma: PrismaClient | undefined;
}

/**
 * Reuse a single PrismaClient instance across the app (and across
 * hot-reloads in dev) to avoid exhausting the Neon connection pool.
 */
export const prisma = globalThis.__prisma ?? new PrismaClient({ adapter });

if (env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
