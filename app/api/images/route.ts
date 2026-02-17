import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { imageCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("orderId");
    if (!orderId) return apiError(400, "Missing orderId");

    const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) return apiError(404, "Order not found");

    const allowed =
      session.user.role === "ADMIN" ||
      (session.user.role === "UTLEIER" && order.landlordId === session.user.id) ||
      (session.user.role === "TJENESTE" && order.assignedToId === session.user.id);

    if (!allowed) return apiError(403, "Forbidden");

    const images = await prisma.image.findMany({
      where: { orderId },
      include: { uploadedBy: { select: { id: true, name: true } }, comments: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(images);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!["ADMIN", "TJENESTE"].includes(session.user.role)) {
      return apiError(403, "Only admin/worker can upload images");
    }

    const body = await req.json();
    const data = imageCreateSchema.parse(body);

    const order = await prisma.serviceOrder.findUnique({ where: { id: data.orderId } });
    if (!order) return apiError(404, "Order not found");
    if (session.user.role === "TJENESTE" && order.assignedToId !== session.user.id) {
      return apiError(403, "Not assigned to order");
    }

    const image = await prisma.image.create({
      data: {
        orderId: data.orderId,
        url: data.url,
        caption: data.caption,
        kind: data.kind,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}