import { Prisma, PrismaClient } from "@prisma/client";

const RETRY_DELAY_MS = 120;
const MAX_DB_RETRIES = 2;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientDbError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientRustPanicError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return ["P1001", "P1002", "P1017", "P2024"].includes(error.code);
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("can't reach database server") ||
      message.includes("timed out") ||
      message.includes("connection closed") ||
      message.includes("connection")
    );
  }
  return false;
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return client.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let attempt = 0;
          for (;;) {
            try {
              return await query(args);
            } catch (error) {
              if (!isTransientDbError(error) || attempt >= MAX_DB_RETRIES) {
                throw error;
              }
              attempt += 1;
              await sleep(RETRY_DELAY_MS * attempt);
            }
          }
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;
const globalForPrisma = globalThis as unknown as { prisma?: ExtendedPrismaClient };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

