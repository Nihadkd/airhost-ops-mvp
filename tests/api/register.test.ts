import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { POST } from "@/app/api/auth/register/route";
import { prisma } from "@/lib/prisma";

describe("POST /api/auth/register", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates worker user", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null as never);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "1", name: "Ab", email: "a@a.com", role: "TJENESTE", createdAt: new Date() } as never);

    const req = new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Ab", email: "a@a.com", password: "password123", role: "TJENESTE" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});