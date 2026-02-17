import { OrderStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { orderCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await requireAuth();
    const where =
      session.user.role === "ADMIN"
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
    if (session.user.role !== "UTLEIER" && session.user.role !== "ADMIN") {
      return apiError(403, "Only landlord/admin can create orders");
    }

    const body = await req.json();
    const data = orderCreateSchema.parse(body);

    const order = await prisma.serviceOrder.create({
      data: {
        type: data.type,
        address: data.address,
        date: new Date(data.date),
        note: data.note,
        landlordId: session.user.role === "ADMIN" && body.landlordId ? body.landlordId : session.user.id,
      },
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}