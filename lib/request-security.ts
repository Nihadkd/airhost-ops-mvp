import { NextResponse } from "next/server";
import { ApiRouteError } from "@/lib/api";
import { env } from "@/lib/env";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getConfiguredAppOrigin() {
  const baseUrl = env.APP_BASE_URL ?? env.NEXTAUTH_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "");
  return normalizeOrigin(baseUrl);
}

function getForwardedRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim();
  if (!host) {
    return "";
  }

  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestOrigin = normalizeOrigin(request.url);
  const protocol = forwardedProto || (requestOrigin.startsWith("https://") ? "https" : "http");

  return normalizeOrigin(`${protocol}://${host}`);
}

function getSourceOrigin(request: Request) {
  const origin = request.headers.get("origin")?.trim();
  if (origin && origin !== "null") {
    return origin;
  }

  return normalizeOrigin(request.headers.get("referer")?.trim());
}

export function getTrustedOrigins(request: Request) {
  const allowedOrigins = new Set<string>();
  const configuredOrigin = getConfiguredAppOrigin();
  const requestOrigin = normalizeOrigin(request.url);
  const forwardedRequestOrigin = getForwardedRequestOrigin(request);

  if (configuredOrigin) {
    allowedOrigins.add(configuredOrigin);
  }

  if (requestOrigin) {
    allowedOrigins.add(requestOrigin);
  }

  if (forwardedRequestOrigin) {
    allowedOrigins.add(forwardedRequestOrigin);
  }

  return allowedOrigins;
}

export function requireTrustedOrigin(request: Request) {
  const origin = getSourceOrigin(request);
  const trustedOrigins = getTrustedOrigins(request);

  if (!origin) {
    return NextResponse.json(
      { code: "ORIGIN_REQUIRED", error: "Missing Origin header" },
      { status: 403 },
    );
  }

  if (!trustedOrigins.has(origin)) {
    return NextResponse.json(
      { code: "UNTRUSTED_ORIGIN", error: "Untrusted request origin" },
      { status: 403 },
    );
  }

  return null;
}

export function assertTrustedOrigin(
  request: Request,
  options?: { allowMissingOriginInNonProduction?: boolean },
) {
  const origin = getSourceOrigin(request);
  const trustedOrigins = getTrustedOrigins(request);

  if (!origin) {
    if (options?.allowMissingOriginInNonProduction && env.NODE_ENV !== "production") {
      return;
    }

    throw new ApiRouteError(403, "Missing Origin header", { code: "ORIGIN_REQUIRED" });
  }

  if (!trustedOrigins.has(origin)) {
    throw new ApiRouteError(403, "Untrusted request origin", { code: "UNTRUSTED_ORIGIN" });
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const connectingIp = request.headers.get("cf-connecting-ip")?.trim();
  if (connectingIp) {
    return connectingIp;
  }

  return "unknown";
}
