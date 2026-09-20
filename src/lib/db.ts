import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Set PRISMA_LOG_QUERIES=1 to print every SQL statement (used to count queries per page).
    log: process.env.PRISMA_LOG_QUERIES ? ["query", "error"] : process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
