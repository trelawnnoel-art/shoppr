import { PrismaClient } from '@/app/generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

// Next.js dev mode hot-reloads modules on every file save, which would spin
// up a fresh PrismaClient (and a fresh connection pool) each time without
// this — stash the instance on the global object so it survives reloads.
// Production doesn't hot-reload, so this is a no-op there.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Prisma 7's SQLite support is adapter-based rather than reading
// DATABASE_URL implicitly — see prisma/schema.prisma's generator comment.
const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? 'file:./dev.db',
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
