import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignmentStatuses } from "@/lib/order-assignment";
import { canAssignedWorkerWriteOrder, isAssignedWorkerPendingStart } from "@/lib/order-worker-access";
import { messageCreateSchema } from "@/lib/validators";
import { sendOrderMessageEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

async function getOrderIfParticipant(orderId: string, userId: string, isAdmin: boolean) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, landlordId: true, assignedToId: true, assignmentStatus: true, status: true, orderNumber: true },
  });
  if (!order) return { ok: false as const, order: null };

  const isParticipant = isAdmin || order.landlordId === userId || order.assignedToId === userId;
  if (!isParticipant) return { ok: false as const, order };

  return { ok: true as const, order };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";

    const { id } = await params;
    const access = await getOrderIfParticipant(id, session.user.id, isAdmin);
    if (!access.ok) return apiError(403, "Forbidden");

    const messages = await prisma.message.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true, email: true } },
      },
    });

    return NextResponse.json(messages, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";

    const { id } = await params;
    const access = await getOrderIfParticipant(id, session.user.id, isAdmin);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const body = await req.json();
    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const isLandlordParticipant = access.order.landlordId === session.user.id;
    const isWorkerParticipant = access.order.assignedToId === session.user.id;
    if (!isAdmin && access.order.assignmentStatus !== assignmentStatuses.CONFIRMED) {
      return apiError(409, "Chat is locked until the assignment is approved by both parties.", {
        code: "ASSIGNMENT_NOT_CONFIRMED",
      });
    }
    if (
      isAssignedWorkerPendingStart(access.order, session.user.id, isAdmin) ||
      (isWorkerParticipant && !canAssignedWorkerWriteOrder(access.order, session.user.id, isAdmin))
    ) {
      return apiError(409, "You must press START before you can write or make changes in this job.", {
        code: "ORDER_NOT_STARTED",
      });
    }

    const recipientId = isLandlordParticipant
      ? access.order.assignedToId
      : isWorkerParticipant
        ? access.order.landlordId
        : null;
    if (!recipientId) return apiError(409, "No recipient available yet for this order");

    const message = await prisma.message.create({
      data: {
        orderId: id,
        senderId: session.user.id,
        recipientId,
        text: parsed.data.text,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true, email: true } },
      },
    });
    const senderName = message.sender?.name?.trim() || session.user.name?.trim() || "Bruker";
    const notificationText = `Ny melding fra ${senderName}`;

    await notifyUserEvent({
      recipient: {
        userId: recipientId,
        email: message.recipient?.email,
        name: message.recipient?.name,
      },
      actorUserId: session.user.id,
      message: notificationText,
      targetUrl: `/orders/${id}#msg-${message.id}`,
      push: {
        title: "Ny melding",
        body: notificationText,
        data: { orderId: id, type: "message", path: `/orders/${id}#msg-${message.id}` },
      },
      email: () =>
        sendOrderMessageEmail({
          to: { email: message.recipient?.email, name: message.recipient?.name },
          orderId: id,
          orderNumber: access.order.orderNumber,
          senderName,
        }),
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
