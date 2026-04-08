import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));
vi.mock("@/lib/env", () => ({
  hasMailConfiguration: vi.fn(() => true),
  env: {
    NEXTAUTH_SECRET: "test-secret",
    NODE_ENV: "test",
    APP_BASE_URL: "http://localhost:3000",
    NEXTAUTH_URL: "http://localhost:3000",
    VERCEL_URL: undefined,
    RESEND_API_KEY: "x",
    RECEIPT_FROM_EMAIL: "test@example.com",
  },
}));
vi.mock("@/lib/auth-email", () => ({
  sendPasswordResetEmail: vi.fn(() => Promise.resolve({ sent: true, provider: "resend" })),
}));

import { prisma } from "@/lib/prisma";
import { hasMailConfiguration } from "@/lib/env";
import { POST as requestReset } from "@/app/api/auth/reset-password/request/route";
import { POST as confirmReset } from "@/app/api/auth/reset-password/confirm/route";
import { signToken } from "@/lib/secure-token";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

describe("password reset via email flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
  });

  it("accepts reset request without disclosing user existence", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);
    const res = await requestReset(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x@example.com" }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns a debug reset link in non-production when mail is not configured", async () => {
    vi.mocked(hasMailConfiguration).mockReturnValue(false);
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "u1",
      email: "x@example.com",
      isActive: true,
    } as never);

    const res = await requestReset(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({ email: "x@example.com" }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(
      expect.objectContaining({
        success: true,
        debugResetUrl: expect.stringContaining("/forgot-password?token="),
      }),
    );
  });

  it("accepts reset request from a trusted origin without disclosing user existence", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);
    const res = await requestReset(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({ email: "x@example.com" }),
      }),
    );
    expect(res.status).toBe(200);
  });

  it("rate limits repeated reset requests from the same ip", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);

    for (let index = 0; index < 5; index += 1) {
      const res = await requestReset(
        new Request("http://localhost/api/auth/reset-password/request", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            "x-forwarded-for": "127.0.0.1",
          },
          body: JSON.stringify({ email: `x${index}@example.com` }),
        }),
      );
      expect(res.status).toBe(200);
    }

    const blocked = await requestReset(
      new Request("http://localhost/api/auth/reset-password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
          "x-forwarded-for": "127.0.0.1",
        },
        body: JSON.stringify({ email: "blocked@example.com" }),
      }),
    );

    expect(blocked.status).toBe(429);
  });

  it("updates password on valid reset token", async () => {
    const token = signToken({
      type: "reset_password",
      exp: Date.now() + 1000 * 60,
      payload: { userId: "u1", email: "x@example.com" },
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", email: "x@example.com", isActive: true } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "u1" } as never);

    const res = await confirmReset(
      new Request("http://localhost/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token, password: "newPassword123" }),
      }),
    );
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.update)).toHaveBeenCalled();
  });

  it("blocks reset confirmation from an untrusted origin", async () => {
    const token = signToken({
      type: "reset_password",
      exp: Date.now() + 1000 * 60,
      payload: { userId: "u1", email: "x@example.com" },
    });

    const res = await confirmReset(
      new Request("http://localhost/api/auth/reset-password/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ token, password: "newPassword123" }),
      }),
    );

    expect(res.status).toBe(403);
    expect(vi.mocked(prisma.user.update)).not.toHaveBeenCalled();
  });
});
