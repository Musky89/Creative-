import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  pool?: Pool;
  prisma?: PrismaClient;
};

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Configure PostgreSQL for Prisma (see README).",
    );
  }
  return url;
}

/**
 * Shared PrismaClient for server-side orchestrator and API routes.
 * Uses the Prisma 7 PostgreSQL driver adapter.
 */
export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const pool =
    globalForPrisma.pool ??
    new Pool({ connectionString: requireDatabaseUrl() });
  globalForPrisma.pool = pool;
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.prisma = prisma;
  return prisma;
}
