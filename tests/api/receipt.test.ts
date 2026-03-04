import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/mailer", () => ({ sendMail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { findUnique: vi.fn() },
    receipt: { findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { sendMail } from "@/lib/mailer";
import { prisma } from "@/lib/prisma";
import { GET, POST } from "@/app/api/orders/[id]/receipt/route";

describe("/api/orders/[id]/receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RECEIPT_ADMIN_EMAIL;
  });

  it("returns receipt when accessible", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "u1", role: "UTLEIER", accountRole: "UTLEIER" },
    } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({
      id: "o1",
      landlordId: "u1",
      assignedToId: null,
      orderNumber: 12,
      type: "CLEANING",
      address: "Addr",
      landlord: { id: "u1", name: "Landlord", email: "l@example.com" },
    } as never);
    vi.mocked(prisma.receipt.findUnique).mockResolvedValue({
      id: "r1",
      receiptNumber: "SN-20260226-00012",
      orderId: "o1",
      amountNok: 600,
      currency: "NOK",
      paidAt: new Date(),
    } as never);

    const res = await GET(new Request("http://localhost"), { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
  });

  it("creates and sends receipt mail", async () => {
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
      landlord: { id: "u1", name: "Landlord", email: "l@example.com" },
    } as never);
    vi.mocked(prisma.receipt.upsert).mockResolvedValue({
      id: "r1",
      receiptNumber: "SN-20260226-00044",
      paidAt: new Date(),
      amountNok: 600,
      note: null,
      recipientName: "Landlord",
      recipientEmail: "l@example.com",
      sentToLandlordAt: null,
      sentToAdminAt: null,
    } as never);
    vi.mocked(prisma.receipt.update).mockResolvedValue({ id: "r1" } as never);
    vi.mocked(sendMail).mockResolvedValue({ sent: true, provider: "resend" });

    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNok: 600 }),
      }),
      { params: Promise.resolve({ id: "o1" }) },
    );

    expect(res.status).toBe(200);
    expect(vi.mocked(sendMail)).toHaveBeenCalled();
  });
});
