import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignmentStatuses } from "@/lib/order-assignment";
import {
  sendAssignmentAcceptedByWorkerEmail,
  sendAssignmentConfirmedEmail,
} from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
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
        landlord: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
    if (!order) return apiError(404, "Order not found");
    if (!isAdmin && order.assignedToId !== session.user.id) return apiError(403, "Forbidden");
    if (order.assignmentStatus !== assignmentStatuses.PENDING_WORKER_ACCEPTANCE) {
      return apiError(409, "Assignment is not waiting for worker acceptance.", {
        code: "ASSIGNMENT_NOT_PENDING_WORKER",
      });
    }

    const updateResult = await prisma.serviceOrder.updateMany({
      where: {
        id,
        assignedToId: order.assignedToId,
        assignmentStatus: assignmentStatuses.PENDING_WORKER_ACCEPTANCE,
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

    const workerName = order.assignedTo?.name || session.user.name || "Tjenesteutforer";

    if (order.landlord) {
      await notifyUserEvent({
        recipient: {
          userId: order.landlord.id,
          email: order.landlord.email,
          name: order.landlord.name,
        },
        actorUserId: session.user.id,
        message: `${workerName} har godtatt oppdrag #${order.orderNumber}. Oppdraget er nå bekreftet.`,
        targetUrl: `/orders/${id}`,
        push: {
          title: "Oppdrag bekreftet",
          body: `${workerName} har godtatt oppdrag #${order.orderNumber}.`,
          data: { orderId: id, type: "assignment_confirmed", path: `/orders/${id}` },
        },
        email: () =>
          sendAssignmentAcceptedByWorkerEmail({
            to: { email: order.landlord.email, name: order.landlord.name },
            orderId: id,
            orderNumber: order.orderNumber,
            workerName,
          }),
      });
    }

    const assignedWorker = order.assignedTo;
    if (isAdmin && assignedWorker && assignedWorker.id !== session.user.id) {
      await notifyUserEvent({
        recipient: {
          userId: assignedWorker.id,
          email: assignedWorker.email,
          name: assignedWorker.name,
        },
        actorUserId: session.user.id,
        message: `Oppdrag #${order.orderNumber} er nå bekreftet.`,
        targetUrl: `/orders/${id}`,
        push: {
          title: "Oppdrag bekreftet",
          body: `Oppdrag #${order.orderNumber} er nå bekreftet.`,
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
