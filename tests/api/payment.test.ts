import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/mailer", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { findUnique: vi.fn(), update: vi.fn() },
    receipt: { upsert: vi.fn(), update: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/orders/[id]/payment/route";
import { POST as confirmPayment } from "@/app/api/orders/[id]/payment/confirm/route";

describe("/api/orders/[id]/payment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RECEIPT_ADMIN_EMAIL;
  });

  it("returns payment summary for accessible order", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", role: "UTLEIER", accountRole: "UTLEIER" },
    } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "u1",
      assignedToId: null,
      type: "CLEANING",
      guestCount: 2,
      paymentIntent: null,
      receipt: null,
      landlord: { id: "u1", name: "Landlord", email: "l@example.com" },
    } as never);

    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("creates payment intent for landlord/admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", role: "UTLEIER", accountRole: "UTLEIER" },
    } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "u1",
      assignedToId: null,
      type: "CLEANING",
      guestCount: 2,
      paymentIntent: null,
      receipt: null,
      landlord: { id: "u1", name: "Landlord", email: "l@example.com" },
    } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({ id: "o1", paymentIntent: "pi_o1_850" } as never);

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNok: 850 }),
      }),
      { params: Promise.resolve({ id: "o1" }) },
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.serviceOrder.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentIntent: "pi_o1_850",
        }),
      }),
    );
  });

  it("confirms payment and issues receipt", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", role: "UTLEIER", accountRole: "UTLEIER" },
    } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "u1",
      assignedToId: null,
      orderNumber: 44,
      type: "CLEANING",
      address: "Addr",
      guestCount: 2,
      paymentIntent: "pi_o1_850",
      receipt: null,
      landlord: { id: "u1", name: "Landlord", email: "l@example.com" },
    } as never);
    vi.mocked(prisma.receipt.upsert).mockResolvedValue({
      id: "r1",
      receiptNumber: "SN-20260226-00044",
      paidAt: new Date(),
      amountNok: 850,
      note: null,
      recipientName: "Landlord",
      recipientEmail: "l@example.com",
      sentToLandlordAt: null,
      sentToAdminAt: null,
    } as never);
    vi.mocked(prisma.receipt.update).mockResolvedValue({ id: "r1" } as never);
    vi.mocked(prisma.serviceOrder.update).mockResolvedValue({ id: "o1", paymentIntent: "pi_o1_850" } as never);
    vi.mocked(sendMail).mockResolvedValue({ sent: true, provider: "resend" });

    const res = await confirmPayment(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNok: 850 }),
      }),
      { params: Promise.resolve({ id: "o1" }) },
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.receipt.upsert)).toHaveBeenCalled();
    expect(vi.mocked(sendMail)).toHaveBeenCalled();
  });
});
