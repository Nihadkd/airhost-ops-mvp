import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    serviceOrder: { count: vi.fn() },
    user: { count: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { GET as listNotifications, POST as createNotification } from "@/app/api/notifications/route";
import { PUT as readNotification } from "@/app/api/notifications/[id]/read/route";
import { GET as getStats } from "@/app/api/admin/stats/route";

describe("notifications and stats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET /api/notifications", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.notification.findMany).mockResolvedValue([] as never);
    const res = await listNotifications();
    expect(res.status).toBe(200);
  });

  it("POST /api/notifications", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({ id: "n1" } as never);
    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ userId: "u1", message: "Test" }),
      headers: { "Content-Type": "application/json" },
    });
    const res = await createNotification(req);
    expect(res.status).toBe(201);
  });

  it("PUT /api/notifications/[id]/read", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.notification.findUnique).mockResolvedValue({ id: "n1", userId: "u1" } as never);
    vi.mocked(prisma.notification.update).mockResolvedValue({ id: "n1", isRead: true } as never);
    const res = await readNotification(new Request("http://localhost"), { params: Promise.resolve({ id: "n1" }) });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/stats", async () => {
    vi.mocked(prisma.serviceOrder.count)
      .mockResolvedValueOnce(3 as never)
      .mockResolvedValueOnce(7 as never);
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10 as never)
      .mockResolvedValueOnce(5 as never);

    const res = await getStats();
    expect(res.status).toBe(200);
  });
});