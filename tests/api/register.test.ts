import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
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
  },
}));
vi.mock("@/lib/auth-email", () => ({
  sendRegistrationVerificationEmail: vi.fn(() => Promise.resolve({ sent: true, provider: "resend" })),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { sendRegistrationVerificationEmail } from "@/lib/auth-email";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStoreForTests();
  });

  it("sends verification email instead of creating user directly", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ab",
        email: "a@a.com",
        phone: "+4790000000",
        password: "password123",
        acceptedTerms: true,
      }),
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", "x-forwarded-for": "127.0.0.1" },
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    expect(vi.mocked(sendRegistrationVerificationEmail)).toHaveBeenCalled();
  });

  it("blocks untrusted origins", async () => {
    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name: "Ab",
        email: "a@a.com",
        phone: "+4790000000",
        password: "password123",
        acceptedTerms: true,
      }),
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("rate limits repeated registration attempts from the same ip", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);

    for (let index = 0; index < 5; index += 1) {
      const res = await POST(
        new Request("http://localhost/api/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: "Ab",
            email: `user${index}@a.com`,
            phone: "+4790000000",
            password: "password123",
            acceptedTerms: true,
          }),
          headers: {
            "Content-Type": "application/json",
            Origin: "http://localhost:3000",
            "x-forwarded-for": "127.0.0.1",
          },
        }),
      );
      expect(res.status).toBe(202);
    }

    const blocked = await POST(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Ab",
          email: "last@a.com",
          phone: "+4790000000",
          password: "password123",
          acceptedTerms: true,
        }),
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
          "x-forwarded-for": "127.0.0.1",
        },
      }),
    );

    expect(blocked.status).toBe(429);
  });
});
