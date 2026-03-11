import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignmentStatuses } from "@/lib/order-assignment";
import { orderAssignmentActionSchema } from "@/lib/validators";
import { sendAssignmentCancelledEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = orderAssignmentActionSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        landlordId: true,
        assignedToId: true,
        assignmentStatus: true,
        landlord: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) return apiError(404, "Order not found");
    if (!order.assignedToId || order.assignmentStatus === assignmentStatuses.UNASSIGNED) {
      return apiError(409, "Order has no active assignment.", { code: "ASSIGNMENT_NOT_ACTIVE" });
    }
    if (order.status === "IN_PROGRESS") {
      return apiError(409, "Started assignments cannot be cancelled from this action.", {
        code: "ASSIGNMENT_ALREADY_STARTED",
      });
    }

    const canCancel = isAdmin || order.landlordId === session.user.id || order.assignedToId === session.user.id;
    if (!canCancel) return apiError(403, "Forbidden");

    const updateResult = await prisma.serviceOrder.updateMany({
      where: {
        id,
        assignedToId: order.assignedToId,
        assignmentStatus: order.assignmentStatus,
      },
      data: {
        assignedToId: null,
        assignmentStatus: assignmentStatuses.UNASSIGNED,
        status: "PENDING",
      },
    });
    if (updateResult.count === 0) {
      return apiError(409, "Assignment state changed. Reload and try again.", {
        code: "ASSIGNMENT_STATE_CHANGED",
      });
    }

    const actorName = session.user.name || "Bruker";
    const genericMessage = parsed.data.reason?.trim()
      ? `Tildelingen for oppdrag #${order.orderNumber} er avbrutt. Grunn: ${parsed.data.reason.trim()}`
      : `Tildelingen for oppdrag #${order.orderNumber} er avbrutt.`;

    const notifications = [];
    if (order.assignedTo && order.assignedTo.id !== session.user.id) {
      notifications.push(
        notifyUserEvent({
          recipient: {
            userId: order.assignedTo.id,
            email: order.assignedTo.email,
            name: order.assignedTo.name,
          },
          actorUserId: session.user.id,
          message: genericMessage,
          targetUrl: `/orders/${id}`,
          push: {
            title: "Tildeling avbrutt",
            body: genericMessage,
            data: { orderId: id, type: "assignment_cancelled", path: `/orders/${id}` },
          },
          email: () =>
            sendAssignmentCancelledEmail({
              to: { email: order.assignedTo?.email, name: order.assignedTo?.name },
              orderId: id,
              orderNumber: order.orderNumber,
            }),
        }),
      );
    }
    if (order.landlord && order.landlord.id !== session.user.id) {
      notifications.push(
        notifyUserEvent({
          recipient: {
            userId: order.landlord.id,
            email: order.landlord.email,
            name: order.landlord.name,
          },
          actorUserId: session.user.id,
          message: `${actorName} avbrt tildelingen for oppdrag #${order.orderNumber}.`,
          targetUrl: `/orders/${id}`,
          push: {
            title: "Tildeling avbrutt",
            body: `${actorName} avbrt tildelingen for oppdrag #${order.orderNumber}.`,
            data: { orderId: id, type: "assignment_cancelled", path: `/orders/${id}` },
          },
          email: () =>
            sendAssignmentCancelledEmail({
              to: { email: order.landlord?.email, name: order.landlord?.name },
              orderId: id,
              orderNumber: order.orderNumber,
            }),
        }),
      );
    }
    await Promise.all(notifications);

    const updated = await prisma.serviceOrder.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
