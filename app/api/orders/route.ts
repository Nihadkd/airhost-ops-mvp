import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { orderCreateSchema } from "@/lib/validators";
import { sendPushToUser } from "@/lib/push";

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
    if (data.type === "CLEANING" && (!data.guestCount || data.guestCount < 1)) {
      return apiError(400, "guestCount is required for cleaning jobs");
    }
    if (isAdmin && !data.landlordId) {
      return apiError(400, "landlordId is required for admin-created orders");
    }
    const landlordId = isAdmin && data.landlordId ? data.landlordId : session.user.id;
    if (isAdmin) {
      const landlord = await prisma.user.findUnique({
        where: { id: landlordId },
        select: { id: true, isActive: true, canLandlord: true, name: true },
      });
      if (!landlord || !landlord.isActive || !landlord.canLandlord) {
        return apiError(400, "Selected landlord is invalid");
      }
    }
    const date = new Date(data.date);
    const minutes = date.getUTCMinutes();
    if ((minutes !== 0 && minutes !== 30) || date.getUTCSeconds() !== 0 || date.getUTCMilliseconds() !== 0) {
      return apiError(400, "Order date must be on the hour or half hour");
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
        note: data.note,
        guestCount: data.guestCount ?? null,
        landlordId,
      },
    });

    if (isAdmin) {
      await prisma.notification.create({
        data: {
          userId: landlordId,
          actorUserId: session.user.id,
          message: `Nytt oppdrag er opprettet for deg: ${order.address}`,
          targetUrl: `/orders/${order.id}`,
        },
      });
      await sendPushToUser(landlordId, {
        title: "Nytt oppdrag opprettet",
        body: `Et nytt oppdrag er opprettet for deg: ${order.address}`,
        data: { orderId: order.id, type: "order_created", path: `/orders/${order.id}` },
      });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
