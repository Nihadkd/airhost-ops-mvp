import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { orderCreateSchema } from "@/lib/validators";
import { sendOrderCreatedEmail } from "@/lib/email-notifications";
import { withDeadlineMetadata } from "@/lib/order-deadline";
import { isGuestCountServiceType } from "@/lib/service-types";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function GET() {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const where =
      isAdmin
        ? {}
        : session.user.role === "UTLEIER"
          ? { landlordId: session.user.id }
          : {
              OR: [
                { assignedToId: session.user.id },
                { assignedToId: null, status: OrderStatus.PENDING },
              ],
            };

    const orders = await prisma.serviceOrder.findMany({
      where,
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    if (session.user.role !== "UTLEIER" && !isAdmin) {
      return apiError(403, "Only landlord/admin can create orders");
    }

    const body = await req.json();
    const data = orderCreateSchema.parse(body);
    const isAirbnbOrder = isGuestCountServiceType(data.type);
    const note = data.note?.trim() || "";
    const details = isAirbnbOrder ? note : data.details?.trim() || "";
    if (!isAirbnbOrder && !note) {
      return apiError(400, "job summary is required for this job type");
    }
    if (!isAirbnbOrder && !details) {
      return apiError(400, "job details are required");
    }
    if (isAirbnbOrder && (!data.guestCount || data.guestCount < 1)) {
      return apiError(400, "guestCount is required for this job type");
    }
    if (isAdmin && !data.landlordId) {
      return apiError(400, "landlordId is required for admin-created orders");
    }
    const landlordId = isAdmin && data.landlordId ? data.landlordId : session.user.id;
    let landlordRecipient: { email: string; name: string } | null = null;
    if (isAdmin) {
      const landlord = await prisma.user.findUnique({
        where: { id: landlordId },
        select: { id: true, isActive: true, canLandlord: true, name: true, email: true },
      });
      if (!landlord || !landlord.isActive || !landlord.canLandlord) {
        return apiError(400, "Selected landlord is invalid");
      }
      landlordRecipient = { email: landlord.email, name: landlord.name };
    }
    const date = new Date(data.date);
    const minutes = date.getUTCMinutes();
    if ((minutes !== 0 && minutes !== 30) || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
      return apiError(400, "Order date must be on the hour or half hour");
    }
    let deadlineAt: Date | null = null;
    if (!isAirbnbOrder) {
      if (!data.deadlineAt) {
        return apiError(400, "Order deadline is required");
      }
      deadlineAt = new Date(data.deadlineAt);
      const deadlineMinutes = deadlineAt.getUTCMinutes();
      if (
        (deadlineMinutes !== 0 && deadlineMinutes !== 30) ||
        deadlineAt.getUTCSeconds() !== 0 ||
        deadlineAt.getUTCMilliseconds() !== 0
      ) {
        return apiError(400, "Order deadline must be on the hour or half hour");
      }
      if (deadlineAt.getTime() <= date.getTime()) {
        return apiError(400, "Order deadline must be after start time");
      }
    }

    const duplicate = await prisma.serviceOrder.findFirst({
      where: {
        landlordId,
        type: data.type,
        address: data.address,
        date,
        status: { in: [OrderStatus.PENDING, OrderStatus.IN_PROGRESS] },
      },
      select: { id: true },
    });
    if (duplicate) {
      return apiError(409, "Active order with same details already exists");
    }

    const order = await prisma.serviceOrder.create({
      data: {
        type: data.type,
        address: data.address,
        date,
        note: isAirbnbOrder ? (note || null) : withDeadlineMetadata(note, deadlineAt?.toISOString()),
        details: details || null,
        guestCount: data.guestCount ?? null,
        landlordId,
      },
    });

    if (isAdmin) {
      await notifyUserEvent({
        recipient: {
          userId: landlordId,
          email: landlordRecipient?.email,
          name: landlordRecipient?.name,
        },
        actorUserId: session.user.id,
        message: `Nytt oppdrag er opprettet for deg: ${order.address}`,
        targetUrl: `/orders/${order.id}`,
        push: {
          title: "Nytt oppdrag opprettet",
          body: `Et nytt oppdrag er opprettet for deg: ${order.address}`,
          data: { orderId: order.id, type: "order_created", path: `/orders/${order.id}` },
        },
        email: landlordRecipient
          ? () =>
              sendOrderCreatedEmail({
                to: landlordRecipient,
                orderId: order.id,
                orderNumber: order.orderNumber,
                address: order.address,
              })
          : null,
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
