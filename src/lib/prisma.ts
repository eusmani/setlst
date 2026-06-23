import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

function createClient() {
  const url = process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });
  return new PrismaClient({ adapter } satisfies Prisma.PrismaClientOptions);
}

const g = globalThis as unknown as { prisma: PrismaClient };
export const prisma = g.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
