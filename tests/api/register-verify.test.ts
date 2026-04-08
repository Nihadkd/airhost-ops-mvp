import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock("@/lib/env", () => ({
  env: {
    NEXTAUTH_SECRET: "test-secret",
    NODE_ENV: "test",
    APP_BASE_URL: "http://localhost:3000",
    NEXTAUTH_URL: "http://localhost:3000",
    VERCEL_URL: undefined,
  },
}));

import { POST } from "@/app/api/auth/register/verify/route";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/secure-token";

describe("POST /api/auth/register/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks untrusted origins", async () => {
    const token = signToken({
      type: "register",
      exp: Date.now() + 1000 * 60,
      payload: {
        name: "Test User",
        email: "test@example.com",
        phone: "+4790000000",
        password: "hashed-password",
        profile: {
          role: "UTLEIER",
          canLandlord: true,
          canService: false,
          activeMode: "UTLEIER",
        },
      },
    });

    const res = await POST(
      new Request("http://localhost/api/auth/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://evil.example",
        },
        body: JSON.stringify({ token }),
      }),
    );

    expect(res.status).toBe(403);
  });

  it("creates the user for a trusted verification request", async () => {
    const token = signToken({
      type: "register",
      exp: Date.now() + 1000 * 60,
      payload: {
        name: "Test User",
        email: "test@example.com",
        phone: "+4790000000",
        password: "hashed-password",
        profile: {
          role: "UTLEIER",
          canLandlord: true,
          canService: false,
          activeMode: "UTLEIER",
        },
      },
    });

    vi.mocked(prisma.user.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: "u1",
      name: "Test User",
      email: "test@example.com",
    } as never);

    const res = await POST(
      new Request("http://localhost/api/auth/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost:3000",
        },
        body: JSON.stringify({ token }),
      }),
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "test@example.com",
          name: "Test User",
        }),
      }),
    );
  });
});
