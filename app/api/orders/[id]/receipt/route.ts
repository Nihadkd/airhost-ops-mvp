import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { estimateOrderAmountNok } from "@/lib/receipt";
import { issueOrderReceipt } from "@/lib/receipt-service";

async function canAccessOrder(orderId: string, userId: string, role: string, accountRole: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    include: {
      landlord: { select: { id: true, name: true, email: true } },
    },
  });
  if (!order) return { ok: false as const, order: null };
  const isAdmin = accountRole === "ADMIN" || role === "ADMIN";
  const isLandlord = order.landlordId === userId;
  const isWorker = order.assignedToId === userId;
  return { ok: isAdmin || isLandlord || isWorker, order };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const access = await canAccessOrder(id, session.user.id, session.user.role, session.user.accountRole);
    if (!access.ok) return apiError(403, "Forbidden");

    const receipt = await prisma.receipt.findUnique({ where: { orderId: id } });
    if (!receipt) return apiError(404, "Receipt not found");

    return NextResponse.json({
      ...receipt,
      downloadUrl: `/api/orders/${id}/receipt/pdf`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const access = await canAccessOrder(id, session.user.id, session.user.role, session.user.accountRole);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const isLandlord = access.order.landlordId === session.user.id;
    if (!isAdmin && !isLandlord) return apiError(403, "Only landlord/admin can issue receipt");

    const body = (await req.json().catch(() => null)) as
      | { amountNok?: number; paidAt?: string; note?: string }
      | null;

    const inferredAmount = estimateOrderAmountNok(access.order.type);
    const amountNok = Number.isFinite(Number(body?.amountNok))
      ? Math.max(1, Math.floor(Number(body?.amountNok)))
      : inferredAmount;
    const paidAt = body?.paidAt ? new Date(body.paidAt) : new Date();
    if (Number.isNaN(paidAt.getTime())) return apiError(400, "Invalid paidAt");

    return NextResponse.json(
      await issueOrderReceipt({
        order: {
          id: access.order.id,
          orderNumber: access.order.orderNumber,
          type: access.order.type,
          address: access.order.address,
          landlord: access.order.landlord,
        },
        amountNok,
        paidAt,
        note: body?.note?.trim() || null,
      }),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
