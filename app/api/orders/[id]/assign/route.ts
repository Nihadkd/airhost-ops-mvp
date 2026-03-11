import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignSchema } from "@/lib/validators";
import { sendAssignedOrderSms } from "@/lib/sms";
import { sendOrderAssignedEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const data = assignSchema.parse(body);

    const worker = await prisma.user.findUnique({ where: { id: data.assignedToId } });
    if (!worker || !worker.isActive || !worker.canService) return apiError(400, "Worker not found");

    const order = await prisma.serviceOrder.update({
      where: { id },
      data: { assignedToId: data.assignedToId, status: "PENDING" },
    });

    await notifyUserEvent({
      recipient: {
        userId: data.assignedToId,
        email: worker.email,
        name: worker.name,
      },
      message: `Nytt oppdrag tildelt: ${order.address}`,
      targetUrl: `/orders/${id}`,
      push: {
        title: "Nytt oppdrag tildelt",
        body: `Du har fått et nytt oppdrag: ${order.address}`,
        data: { orderId: id, type: "order_assigned", path: `/orders/${id}` },
      },
      email: () =>
        sendOrderAssignedEmail({
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
