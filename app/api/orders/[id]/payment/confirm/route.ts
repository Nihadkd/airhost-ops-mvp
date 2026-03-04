import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { issueOrderReceipt } from "@/lib/receipt-service";
import { estimatePaymentAmountNok, parseStubPaymentIntentAmount } from "@/lib/payments/order-payment";

async function canAccessOrder(orderId: string, userId: string, role: string, accountRole: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      landlord: { select: { id: true, name: true, email: true } },
      receipt: true,
    },
  });
  if (!order) return { ok: false as const, order: null };
  const isAdmin = accountRole === "ADMIN" || role === "ADMIN";
  const isLandlord = order.landlordId === userId;
  const isWorker = order.assignedToId === userId;
  return { ok: isAdmin || isLandlord || isWorker, order, isAdmin, isLandlord };
}

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const id = String((await params).id ?? "");
    const access = await canAccessOrder(id, session.user.id, session.user.role, session.user.accountRole);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");
    if (!access.isAdmin && !access.isLandlord) return apiError(403, "Only landlord/admin can confirm payment");

    const body = (await req.json().catch(() => null)) as { amountNok?: number; note?: string } | null;
    const amountNok = Number.isFinite(Number(body?.amountNok))
      ? Math.max(1, Math.floor(Number(body?.amountNok)))
      : access.order.receipt?.amountNok ??
        parseStubPaymentIntentAmount(access.order.paymentIntent) ??
        estimatePaymentAmountNok(access.order.type, access.order.guestCount);

    const receiptPayload = await issueOrderReceipt({
      order: {
        id: access.order.id,
        orderNumber: access.order.orderNumber,
        type: access.order.type,
        address: access.order.address,
        landlord: access.order.landlord,
      },
      amountNok,
      note: body?.note ?? null,
    });

    await prisma.serviceOrder.update({
      where: { id },
      data: {
        paymentIntent: access.order.paymentIntent ?? `pi_${id}_${amountNok}`,
      },
    });

    return NextResponse.json({
      status: "paid",
      amountNok,
      paymentIntent: access.order.paymentIntent ?? `pi_${id}_${amountNok}`,
      ...receiptPayload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
