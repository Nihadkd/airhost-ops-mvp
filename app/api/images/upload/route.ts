import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!["ADMIN", "TJENESTE"].includes(session.user.role)) {
      return apiError(403, "Only admin/worker can upload files");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const orderId = String(formData.get("orderId") ?? "");
    const caption = String(formData.get("caption") ?? "");
    const kind = String(formData.get("kind") ?? "");

    if (!file || !orderId) return apiError(400, "Missing file/orderId");

    const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) return apiError(404, "Order not found");
    if (session.user.role === "TJENESTE" && order.assignedToId !== session.user.id) {
      return apiError(403, "Not assigned to order");
    }

    const url = await saveUpload(file);
    const image = await prisma.image.create({
      data: {
        url,
        orderId,
        caption: caption || undefined,
        kind: kind || undefined,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}