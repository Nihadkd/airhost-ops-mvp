import { NextResponse } from "next/server";

export function apiError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return apiError(401, "Unauthorized");
    if (error.message === "FORBIDDEN") return apiError(403, "Forbidden");
  }
  return apiError(500, "Internal server error");
}
