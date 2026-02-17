import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "TJENESTE") {
      return apiError(403, "Only worker can claim jobs");
    }

    const { id } = await params;
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) return apiError(404, "Order not found");

    if (order.assignedToId && order.assignedToId !== session.user.id) {
      return apiError(409, "Order already assigned");
    }

    const updated = await prisma.serviceOrder.update({
      where: { id },
      data: {
        assignedToId: session.user.id,
        status: "IN_PROGRESS",
      },
    });

    await prisma.notification.create({
      data: {
        userId: order.landlordId,
        message: "En tjenesteutfører har påtatt seg oppdraget ditt.",
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
