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
  },
}));
vi.mock("@/lib/auth-email", () => ({
  sendRegistrationVerificationEmail: vi.fn(() => Promise.resolve({ sent: true, provider: "resend" })),
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";
import { sendRegistrationVerificationEmail } from "@/lib/auth-email";

describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

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
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(202);
    expect(vi.mocked(sendRegistrationVerificationEmail)).toHaveBeenCalled();
  });
});
