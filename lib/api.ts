import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

type ApiErrorBody = {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
};

export class ApiRouteError extends Error {
  status: number;
  code?: string;
  details?: Record<string, unknown>;

  constructor(status: number, message: string, options?: { code?: string; details?: Record<string, unknown> }) {
    super(message);
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

export function apiError(status: number, message: string, options?: { code?: string; details?: Record<string, unknown> }) {
  const body: ApiErrorBody = { error: message };
  if (options?.code) body.code = options.code;
  if (options?.details) body.details = options.details;
  return NextResponse.json(body, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiRouteError) {
    return apiError(error.status, error.message, { code: error.code, details: error.details });
  }

  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return apiError(401, "Unauthorized");
    if (error.message === "FORBIDDEN") return apiError(403, "Forbidden");
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return apiError(503, "Database is temporarily unavailable");
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P1001", "P1002", "P1017", "P2024"].includes(error.code)) {
      return apiError(503, "Database is temporarily unavailable");
    }
  }

  return apiError(500, "Internal server error");
}
