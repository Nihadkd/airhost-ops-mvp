import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignmentStatuses } from "@/lib/order-assignment";
import { sendAssignmentConfirmedEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const { id } = await params;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        landlordId: true,
        assignedToId: true,
        assignmentStatus: true,
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) return apiError(404, "Order not found");
    if (!isAdmin && order.landlordId !== session.user.id) return apiError(403, "Forbidden");
    if (!order.assignedToId || order.assignmentStatus !== assignmentStatuses.PENDING_LANDLORD_APPROVAL) {
      return apiError(409, "Assignment is not waiting for landlord approval.", {
        code: "ASSIGNMENT_NOT_PENDING_LANDLORD",
      });
    }

    const updateResult = await prisma.serviceOrder.updateMany({
      where: {
        id,
        assignedToId: order.assignedToId,
        assignmentStatus: assignmentStatuses.PENDING_LANDLORD_APPROVAL,
      },
      data: {
        assignmentStatus: assignmentStatuses.CONFIRMED,
      },
    });
    if (updateResult.count === 0) {
      return apiError(409, "Assignment state changed. Reload and try again.", {
        code: "ASSIGNMENT_STATE_CHANGED",
      });
    }

    const assignedWorker = order.assignedTo;
    if (assignedWorker) {
      await notifyUserEvent({
        recipient: {
          userId: assignedWorker.id,
          email: assignedWorker.email,
          name: assignedWorker.name,
        },
        actorUserId: session.user.id,
        message: `Du er godkjent for oppdrag #${order.orderNumber}.`,
        targetUrl: `/orders/${id}`,
        push: {
          title: "Oppdrag godkjent",
          body: `Du er godkjent for oppdrag #${order.orderNumber}.`,
          data: { orderId: id, type: "assignment_confirmed", path: `/orders/${id}` },
        },
        email: () =>
          sendAssignmentConfirmedEmail({
            to: { email: assignedWorker.email, name: assignedWorker.name },
            orderId: id,
            orderNumber: order.orderNumber,
          }),
      });
    }

    const updated = await prisma.serviceOrder.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
