import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { findUnique: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/orders/[id]/messages/route";

describe("/api/orders/[id]/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks admin from reading chat", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(403);
  });

  it("allows landlord to read own order chat", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", assignedToId: "t1" } as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([] as never);

    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("creates chat message to counterpart", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", assignedToId: "t1" } as never);
    vi.mocked(prisma.message.create).mockResolvedValue({ id: "m1", text: "Hei" } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hei" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(201);
  });
});
