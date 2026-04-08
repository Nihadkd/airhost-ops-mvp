import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRoleWithRequest } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignSchema } from "@/lib/validators";
import { sendAssignedOrderSms } from "@/lib/sms";
import { sendAssignmentOfferedEmail } from "@/lib/email-notifications";
import { assignmentStatuses } from "@/lib/order-assignment";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRoleWithRequest(["ADMIN"], req);
    const { id } = await params;
    const body = await req.json();
    const data = assignSchema.parse(body);

    const worker = await prisma.user.findUnique({ where: { id: data.assignedToId } });
    if (!worker || !worker.isActive || !worker.canService) return apiError(400, "Worker not found");

    const existingOrder = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        address: true,
        date: true,
        assignedToId: true,
        assignmentStatus: true,
      },
    });
    if (!existingOrder) return apiError(404, "Order not found");
    if (existingOrder.assignedToId || existingOrder.assignmentStatus !== assignmentStatuses.UNASSIGNED) {
      return apiError(409, "Order already has an active assignment. Cancel it before assigning a new worker.", {
        code: "ORDER_ALREADY_ASSIGNED",
      });
    }

    const updateResult = await prisma.serviceOrder.updateMany({
      where: {
        id,
        assignedToId: null,
        assignmentStatus: assignmentStatuses.UNASSIGNED,
      },
      data: {
        assignedToId: data.assignedToId,
        status: "PENDING",
        assignmentStatus: assignmentStatuses.PENDING_WORKER_ACCEPTANCE,
      },
    });
    if (updateResult.count === 0) {
      return apiError(409, "Order already has an active assignment. Cancel it before assigning a new worker.", {
        code: "ORDER_ALREADY_ASSIGNED",
      });
    }

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        address: true,
        date: true,
        assignedToId: true,
        assignmentStatus: true,
      },
    });
    if (!order) return apiError(404, "Order not found");

    await notifyUserEvent({
      recipient: {
        userId: data.assignedToId,
        email: worker.email,
        name: worker.name,
      },
      message: `Oppdrag #${order.orderNumber} er tildelt deg og venter pa din godkjenning.`,
      targetUrl: `/orders/${id}`,
      push: {
        title: "Godkjenn oppdrag",
        body: `Oppdrag #${order.orderNumber} pa ${order.address} venter pa din godkjenning.`,
        data: { orderId: id, type: "assignment_offered", path: `/orders/${id}` },
      },
      email: () =>
        sendAssignmentOfferedEmail({
          to: { email: worker.email, name: worker.name },
          orderId: id,
          orderNumber: order.orderNumber,
          address: order.address,
        }),
    });

    await sendAssignedOrderSms({
      workerPhone: worker.phone,
      orderId: String(order.orderNumber),
      address: order.address,
      date: order.date,
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
