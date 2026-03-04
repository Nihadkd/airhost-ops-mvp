import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { createPaymentIntent } from "@/lib/payments/provider";
import {
  buildStubPaymentIntentId,
  derivePaymentStatus,
  estimatePaymentAmountNok,
  parseStubPaymentIntentAmount,
} from "@/lib/payments/order-payment";

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

export async function GET(_: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const id = String((await params).id ?? "");
    const access = await canAccessOrder(id, session.user.id, session.user.role, session.user.accountRole);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const pendingAmount = parseStubPaymentIntentAmount(access.order.paymentIntent);
    const amountNok =
      access.order.receipt?.amountNok ??
      pendingAmount ??
      estimatePaymentAmountNok(access.order.type, access.order.guestCount);

    return NextResponse.json({
      status: derivePaymentStatus({
        paymentIntent: access.order.paymentIntent,
        receiptAmountNok: access.order.receipt?.amountNok,
      }),
      provider: "stub",
      amountNok,
      paymentIntent: access.order.paymentIntent,
      receiptId: access.order.receipt?.id ?? null,
      paidAt: access.order.receipt?.paidAt ?? null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth();
    const id = String((await params).id ?? "");
    const access = await canAccessOrder(id, session.user.id, session.user.role, session.user.accountRole);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");
    if (!access.isAdmin && !access.isLandlord) return apiError(403, "Only landlord/admin can create payment");

    const body = (await req.json().catch(() => null)) as { amountNok?: number } | null;
    const amountNok = Number.isFinite(Number(body?.amountNok))
      ? Math.max(1, Math.floor(Number(body?.amountNok)))
      : estimatePaymentAmountNok(access.order.type, access.order.guestCount);

    const intent = await createPaymentIntent({ orderId: id, amountNok, currency: "NOK" });
    const paymentIntent = buildStubPaymentIntentId(id, amountNok) || intent.id;

    await prisma.serviceOrder.update({
      where: { id },
      data: { paymentIntent },
    });

    return NextResponse.json({
      status: "pending",
      provider: intent.provider,
      amountNok,
      paymentIntent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
