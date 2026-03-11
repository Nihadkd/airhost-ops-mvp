import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { findUnique: vi.fn() },
    message: { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { GET, POST } from "@/app/api/orders/[id]/messages/route";
import { DELETE as deleteMessage } from "@/app/api/orders/[id]/messages/[messageId]/route";

describe("/api/orders/[id]/messages", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks admin from reading chat", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(403);
  });

  it("allows landlord to read own order chat", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      status: "IN_PROGRESS",
      orderNumber: 10,
    } as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([] as never);

    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("creates chat message to counterpart", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      status: "IN_PROGRESS",
      orderNumber: 10,
    } as never);
    vi.mocked(prisma.message.create).mockResolvedValue({
      id: "m1",
      text: "Hei",
      sender: { id: "l1", name: "Landlord", role: "UTLEIER" },
      recipient: { id: "t1", name: "Worker", role: "TJENESTE", email: "worker@example.com" },
    } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hei" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "t1",
          targetUrl: "/orders/o1#msg-m1",
        }),
      }),
    );
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        title: "Ny melding",
        data: expect.objectContaining({
          orderId: "o1",
          path: "/orders/o1#msg-m1",
          type: "message",
        }),
      }),
    );
  });

  it("deletes own chat message", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      status: "IN_PROGRESS",
      orderNumber: 10,
    } as never);
    vi.mocked(prisma.message.findUnique).mockResolvedValue({ id: "m1", orderId: "o1", senderId: "l1" } as never);
    vi.mocked(prisma.message.delete).mockResolvedValue({ id: "m1" } as never);

    const res = await deleteMessage(new Request("http://localhost", { method: "DELETE" }), {
      params: Promise.resolve({ id: "o1", messageId: "m1" }),
    });

    expect(res.status).toBe(200);
  });

  it("blocks worker from sending chat message before START", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      status: "PENDING",
      orderNumber: 10,
    } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hei" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "o1" }) });
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data).toEqual(expect.objectContaining({ code: "ORDER_NOT_STARTED" }));
    expect(vi.mocked(prisma.message.create)).not.toHaveBeenCalled();
  });
});
