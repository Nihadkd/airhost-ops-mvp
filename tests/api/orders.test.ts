import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn(), requireRole: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendAssignedOrderSms: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    user: { findUnique: vi.fn() },
    serviceOrder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    message: { create: vi.fn() },
    notification: { create: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";
import { GET as listOrders, POST as createOrder } from "@/app/api/orders/route";
import { GET as getOrder, PUT as updateOrder, DELETE as deleteOrder } from "@/app/api/orders/[id]/route";
import { PUT as claimOrder } from "@/app/api/orders/[id]/claim/route";
import { PUT as assignOrder } from "@/app/api/orders/[id]/assign/route";
import { sendAssignedOrderSms } from "@/lib/sms";

const validHalfHourIso = "2026-03-01T10:30:00.000Z";
const validDeadlineHalfHourIso = "2026-03-01T12:30:00.000Z";

describe("/api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma as typeof prisma) as never);
  });

  it("GET lists orders", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findMany).mockResolvedValue([] as never);
    const res = await listOrders();
    expect(res.status).toBe(200);
  });

  it("POST creates order", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.serviceOrder.create).mockResolvedValue({ id: "o1" } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 1",
        date: validHalfHourIso,
        deadlineAt: validDeadlineHalfHourIso,
        guestCount: 2,
        note: "Need help cleaning before inspection",
        details: "Clean the apartment thoroughly before inspection, including floors, bathroom and kitchen.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
  });

  it("POST creates non-Airbnb order without guest count when summary is provided", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.serviceOrder.create).mockResolvedValue({ id: "o1" } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 1",
        date: validHalfHourIso,
        deadlineAt: validDeadlineHalfHourIso,
        note: "Wipe surfaces and floors",
        details: "Wipe all surfaces, vacuum the living room, and mop the kitchen floor.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
  });

  it("POST requires a short summary for non-Airbnb jobs", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ type: "CLEANING", address: "Street 1", date: validHalfHourIso, deadlineAt: validDeadlineHalfHourIso }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(400);
  });

  it("POST requires detailed job text", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({ type: "KEY_HANDLING", address: "Street 1", date: validHalfHourIso, deadlineAt: validDeadlineHalfHourIso, guestCount: 2 }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(400);
  });

  it("POST requires guest count for Airbnb jobs", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "KEY_HANDLING",
        address: "Street 1",
        date: validHalfHourIso,
        deadlineAt: validDeadlineHalfHourIso,
        details: "Handle check-in, check-out, key handover and prepare the apartment for the next guest.",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(400);
  });

  it("POST rejects order dates that are not on the hour or half hour", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 1",
        date: "2026-03-01T10:15:00.000Z",
        deadlineAt: validDeadlineHalfHourIso,
        guestCount: 2,
        note: "Uneven time test",
        details: "Detailed text for uneven time test",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(400);
  });

  it("POST rejects deadline that is before start time", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 1",
        date: validHalfHourIso,
        deadlineAt: "2026-03-01T10:00:00.000Z",
        guestCount: 2,
        note: "Deadline before start",
        details: "Detailed text for deadline validation",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(400);
  });

  it("POST lets admin create order on behalf of landlord and sends notification", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN", accountRole: "ADMIN" } } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "l1",
      isActive: true,
      canLandlord: true,
      name: "Landlord 1",
      email: "l1@example.com",
    } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.serviceOrder.create).mockResolvedValue({ id: "o2", address: "Street 9", orderNumber: 25 } as never);

    const req = new Request("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 9",
        date: validHalfHourIso,
        deadlineAt: validDeadlineHalfHourIso,
        guestCount: 2,
        note: "Clean and prepare for tenant",
        details: "Clean and prepare the apartment before the tenant arrives, including fresh linens.",
        landlordId: "l1",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createOrder(req);
    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.serviceOrder.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          landlordId: "l1",
        }),
      }),
    );
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "l1",
          actorUserId: "a1",
          targetUrl: "/orders/o2",
        }),
      }),
    );
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "l1",
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o2",
          path: "/orders/o2",
          type: "order_created",
        }),
      }),
    );
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

  it("PUT /api/orders/[id] allows landlord to update published order fields", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      status: "IN_PROGRESS",
    } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({
      id: "o1",
      type: "CLEANING",
      guestCount: 5,
    } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        type: "CLEANING",
        address: "Street 2",
        date: new Date().toISOString(),
        guestCount: 5,
        note: "Updated",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await updateOrder(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "CLEANING",
          guestCount: 5,
          address: "Street 2",
        }),
      }),
    );
  });

  it("PUT /api/orders/[id] sends clear landlord notification when worker completes", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      orderNumber: 42,
      status: "IN_PROGRESS",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "l1", name: "Landlord", email: "l@example.com" } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({ id: "o1", status: "COMPLETED" } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ status: "COMPLETED" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await updateOrder(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "l1",
          actorUserId: "t1",
          message: expect.stringContaining("klart for betaling"),
        }),
      }),
    );
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "l1",
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o1",
          path: "/orders/o1",
          type: "order_completed",
        }),
      }),
    );
  });

  it("PUT /api/orders/[id] blocks worker from starting a later assigned job before an earlier one", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o2",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      orderNumber: 102,
      date: new Date("2026-03-10T10:00:00.000Z"),
      status: "PENDING",
    } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      orderNumber: 101,
      date: new Date("2026-03-05T10:00:00.000Z"),
      status: "PENDING",
    } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await updateOrder(req, { params: Promise.resolve({ id: "o2" }) });
    const data = await res.json();
    expect(res.status).toBe(409);
    expect(data).toEqual(expect.objectContaining({ code: "WORKER_SEQUENCE_BLOCKED" }));
    expect(vi.mocked(prisma.serviceOrder.update)).not.toHaveBeenCalled();
  });

  it("PUT /api/orders/[id] lets worker start their earliest assigned open job", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      orderNumber: 101,
      date: new Date("2026-03-05T10:00:00.000Z"),
      status: "PENDING",
    } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue({
      id: "o1",
      landlordId: "l1",
      assignedToId: "t1",
      assignmentStatus: "CONFIRMED",
      orderNumber: 101,
      date: new Date("2026-03-05T10:00:00.000Z"),
      status: "PENDING",
    } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({
      id: "o1",
      assignedToId: "t1",
      status: "IN_PROGRESS",
    } as never);

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await updateOrder(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.$executeRaw)).toHaveBeenCalled();
    expect(vi.mocked(prisma.serviceOrder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "o1" },
        data: { status: "IN_PROGRESS" },
      }),
    );
  });

  it("DELETE /api/orders/[id]", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "a1", role: "ADMIN" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", status: "PENDING" } as never);
    vi.mocked(prisma.serviceOrder.delete).mockResolvedValue({ id: "o1" } as never);

    const res = await deleteOrder(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/orders/[id] allows landlord to delete own non-pending order", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", landlordId: "l1", status: "IN_PROGRESS" } as never);
    vi.mocked(prisma.serviceOrder.delete).mockResolvedValue({ id: "o1" } as never);

    const res = await deleteOrder(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("PUT /api/orders/[id]/claim", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", name: "Worker 1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      orderNumber: 101,
      address: "Street 1",
      date: new Date("2026-03-01T10:00:00.000Z"),
      landlordId: "l1",
      assignedToId: null,
      assignmentStatus: "UNASSIGNED",
      status: "PENDING",
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "l1", email: "l@example.com", name: "Landlord" } as never);
    vi.mocked(prisma.serviceOrder.findFirst).mockResolvedValue(null as never);
    vi.mocked(prisma.serviceOrder.updateMany).mockResolvedValue({ count: 1 } as never);

    const res = await claimOrder(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.notification.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "l1",
          actorUserId: "t1",
          message: expect.stringContaining("Du ma godkjenne"),
        }),
      }),
    );
    expect(vi.mocked(prisma.message.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o1",
          senderId: "t1",
          recipientId: "l1",
        }),
      }),
    );
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "l1",
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o1",
          path: "/orders/o1",
          type: "assignment_pending_landlord",
        }),
      }),
    );
    expect(vi.mocked(prisma.$executeRaw)).toHaveBeenCalledTimes(1);
  });

  it("PUT /api/orders/[id]/claim blocks second worker from taking same job", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t2", name: "Worker 2", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      orderNumber: 101,
      address: "Street 1",
      date: new Date("2026-03-01T10:00:00.000Z"),
      landlordId: "l1",
      assignedToId: "t1",
      status: "IN_PROGRESS",
    } as never);

    const res = await claimOrder(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(409);
  });

  it("PUT /api/orders/[id]/claim allows worker to claim later order on the same address", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t2", name: "Worker 2", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o2",
      orderNumber: 102,
      address: "Street 1",
      date: new Date("2026-03-01T12:00:00.000Z"),
      landlordId: "l1",
      assignedToId: null,
      assignmentStatus: "UNASSIGNED",
      status: "PENDING",
    } as never);
    vi.mocked(prisma.serviceOrder.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "l1", email: "l@example.com", name: "Landlord" } as never);

    const res = await claimOrder(new Request("http://localhost", { method: "PUT" }), { params: Promise.resolve({ id: "o2" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "o2",
          assignedToId: null,
          assignmentStatus: "UNASSIGNED",
          status: "PENDING",
        }),
      }),
    );
  });

  it("PUT /api/orders/[id]/assign sends sms to worker", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "t1",
      name: "Worker 1",
      email: "worker@example.com",
      role: "TJENESTE",
      phone: "+4790000000",
      isActive: true,
      canService: true,
    } as never);
    vi.mocked(prisma.serviceOrder.findUnique)
      .mockResolvedValueOnce({
        id: "o1",
        orderNumber: 777,
        address: "Karl Johans gate 1",
        date: new Date("2026-02-21T12:00:00.000Z"),
        assignedToId: null,
        assignmentStatus: "UNASSIGNED",
      } as never)
      .mockResolvedValueOnce({
        id: "o1",
        orderNumber: 777,
        address: "Karl Johans gate 1",
        date: new Date("2026-02-21T12:00:00.000Z"),
        assignedToId: "t1",
        assignmentStatus: "PENDING_WORKER_ACCEPTANCE",
      } as never);
    vi.mocked(prisma.serviceOrder.updateMany).mockResolvedValue({
      count: 1,
    } as never);
    const req = new Request("http://localhost", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId: "t1" }),
    });
    const res = await assignOrder(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(sendAssignedOrderSms)).toHaveBeenCalledWith(
      expect.objectContaining({ workerPhone: "+4790000000", orderId: "777" }),
    );
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "t1",
      expect.objectContaining({
        data: expect.objectContaining({
          orderId: "o1",
          path: "/orders/o1",
          type: "assignment_offered",
        }),
      }),
    );
  });
});
