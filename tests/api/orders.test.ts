import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    notification: { create: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { GET as listOrders, POST as createOrder } from "@/app/api/orders/route";
import { GET as getOrder, PUT as updateOrder, DELETE as deleteOrder } from "@/app/api/orders/[id]/route";
import { PUT as claimOrder } from "@/app/api/orders/[id]/claim/route";

describe("/api/orders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("GET lists orders", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([] as never);
    const res = await listOrders();
    expect(res.status).toBe(200);
  });

  it("POST creates order", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.create).mockResolvedValue({ id: "o1" } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ type: "CLEANING", address: "Street 1", date: new Date().toISOString() }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
  });

  it("GET /api/orders/[id]", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique)
      .mockResolvedValueOnce({ id: "o1", landlordId: "l1", assignedToId: "t1", status: "IN_PROGRESS" } as never)
      .mockResolvedValueOnce({ id: "o1", images: [] } as never);

    const res = await getOrder(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("PUT /api/orders/[id]", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", assignedToId: "t1", status: "IN_PROGRESS" } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({ id: "o1", status: "COMPLETED" } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ status: "COMPLETED" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await updateOrder(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/orders/[id]", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", status: "PENDING" } as never);
    vi.mocked(prisma.serviceOrder.delete).mockResolvedValue({ id: "o1" } as never);

    const res = await deleteOrder(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("PUT /api/orders/[id]/claim", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", assignedToId: null, status: "PENDING" } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({ id: "o1", assignedToId: "t1", status: "IN_PROGRESS" } as never);

    const res = await claimOrder(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });
});