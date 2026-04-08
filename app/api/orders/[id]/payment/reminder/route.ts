import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { sendPaymentReminderEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

type RouteContext = { params: Promise<Record<string, string | string[] | undefined>> };

export async function POST(req: Request, { params }: RouteContext) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
    const id = String((await params).id ?? "");

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        receipt: true,
      },
    });
    if (!order) return apiError(404, "Order not found");

    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const isAssignedWorker = session.user.role === "TJENESTE" && order.assignedToId === session.user.id;
    if (!isAdmin && !isAssignedWorker) {
      return apiError(403, "Only admin/assigned worker can send payment reminder", { code: "PAYMENT_REMINDER_FORBIDDEN" });
    }

    if (order.receipt) {
      return apiError(409, "Payment already completed", { code: "PAYMENT_ALREADY_COMPLETED" });
    }

    const reminderText = `Betalingspåminnelse: Oppdrag #${order.orderNumber} er klart for betaling.`;

    const delivery = await notifyUserEvent({
      recipient: {
        userId: order.landlordId,
        email: order.landlord.email,
        name: order.landlord.name,
      },
      actorUserId: session.user.id,
      message: reminderText,
      targetUrl: `/orders/${id}`,
      push: {
        title: "Betalingspåminnelse",
        body: reminderText,
        data: { orderId: id, type: "payment_reminder", path: `/orders/${id}` },
      },
      email: () =>
        sendPaymentReminderEmail({
          to: { email: order.landlord.email, name: order.landlord.name },
          orderId: id,
          orderNumber: order.orderNumber,
        }),
    });

    return NextResponse.json({ success: true, deliveries: delivery.deliveries });
  } catch (error) {
    return handleApiError(error);
  }
}
