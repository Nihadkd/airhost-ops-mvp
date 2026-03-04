import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { count: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { GET as getDashboard } from "@/app/api/dashboard/route";

describe("/api/dashboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns active orders with nearest sorting and search", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([] as never);

    const res = await getDashboard(new Request("http://localhost/api/dashboard?sort=NEAREST&search=test"));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { date: "asc" },
      }),
    );
  });

  it("returns completed orders for worker in completed view", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([] as never);

    const res = await getDashboard(new Request("http://localhost/api/dashboard?view=completed"));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assignedToId: "t1",
          status: "COMPLETED",
        },
      }),
    );
  });

  it("returns assigned pending and in-progress orders on my view for landlord", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([] as never);

    const res = await getDashboard(new Request("http://localhost/api/dashboard?view=my&status=ongoing"));
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          landlordId: "l1",
          assignedToId: { not: null },
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
      }),
    );
  });

  it("maps payment status in dashboard rows", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.count).mockResolvedValue(1 as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([
      {
        id: "o1",
        orderNumber: 10,
        type: "CLEANING",
        address: "Street 1",
        status: "IN_PROGRESS",
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedToId: "t1",
        paymentIntent: "pi_o1_850",
        receipt: null,
        landlord: { id: "l1", name: "Landlord" },
        assignedTo: { id: "t1", name: "Worker" },
      },
    ] as never);

    const res = await getDashboard(new Request("http://localhost/api/dashboard?view=my"));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.orders[0].paymentStatus).toBe("pending");
  });
});
