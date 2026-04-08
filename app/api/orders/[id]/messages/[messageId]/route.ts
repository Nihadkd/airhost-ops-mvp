import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> },
) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";

    const { id, messageId } = await params;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: { id: true, landlordId: true, assignedToId: true },
    });
    if (!order) return apiError(404, "Order not found");

    const isParticipant = isAdmin || order.landlordId === session.user.id || order.assignedToId === session.user.id;
    if (!isParticipant) return apiError(403, "Forbidden");

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: { id: true, orderId: true },
    });
    if (!message || message.orderId !== id) return apiError(404, "Message not found");

    await prisma.message.delete({ where: { id: messageId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
