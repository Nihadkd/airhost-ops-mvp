import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { GET, POST } from "@/app/api/users/route";
import { prisma } from "@/lib/prisma";

describe("/api/users", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET returns users", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("POST creates user", async () => {
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "u1" } as never);
    const req = new Request("http://localhost/api/users", {
      method: "POST",
      body: JSON.stringify({ name: "Xx", email: "x@x.com", password: "password123", role: "UTLEIER" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});