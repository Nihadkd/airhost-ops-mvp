import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignSchema } from "@/lib/validators";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const data = assignSchema.parse(body);

    const worker = await prisma.user.findUnique({ where: { id: data.assignedToId } });
    if (!worker || worker.role !== "TJENESTE") return apiError(400, "Worker not found");

    const order = await prisma.serviceOrder.update({
      where: { id },
      data: { assignedToId: data.assignedToId, status: "IN_PROGRESS" },
    });

    await prisma.notification.create({
      data: {
        userId: data.assignedToId,
        message: `Nytt oppdrag tildelt: ${order.address}`,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}