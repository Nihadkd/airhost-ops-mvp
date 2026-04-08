import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));
vi.mock("@/lib/user-role", () => ({
  ADMIN_VIEW_COOKIE: "admin-view",
  resolveUserRole: vi.fn(async (_userId: string, options?: { adminViewMode?: "ADMIN" | "UTLEIER" | "TJENESTE" }) => ({
    role: "UTLEIER",
    canLandlord: true,
    canService: false,
    activeMode: "UTLEIER",
    adminViewMode: options?.adminViewMode ?? "ADMIN",
  })),
}));
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    APP_BASE_URL: "http://localhost:3000",
    NEXTAUTH_URL: "http://localhost:3000",
    VERCEL_URL: undefined,
  },
}));

import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/rbac";
import { resolveUserRole } from "@/lib/user-role";

describe("requireAuth trusted-origin enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: {
        id: "u1",
        name: "Test User",
        email: "user@example.com",
        role: "UTLEIER",
      },
    } as never);
  });

  it("rejects authenticated mutating requests from untrusted origins", async () => {
    await expect(
      requireAuth({
        request: new Request("http://localhost/api/test", {
          method: "POST",
          headers: { Origin: "https://evil.example" },
        }),
        requireTrustedOrigin: true,
      }),
    ).rejects.toMatchObject({
      status: 403,
      code: "UNTRUSTED_ORIGIN",
    });
  });

  it("allows authenticated mutating requests from the configured origin", async () => {
    const session = await requireAuth({
      request: new Request("http://localhost/api/test", {
        method: "POST",
        headers: { Origin: "http://localhost:3000" },
      }),
      requireTrustedOrigin: true,
    });

    expect(session.user.id).toBe("u1");
    expect(vi.mocked(resolveUserRole)).toHaveBeenCalledWith("u1", { adminViewMode: "ADMIN" });
  });

  it("allows missing origin headers outside production for developer tools and tests", async () => {
    const session = await requireAuth({
      request: new Request("http://localhost/api/test", { method: "POST" }),
      requireTrustedOrigin: true,
    });

    expect(session.user.email).toBe("user@example.com");
  });
});
