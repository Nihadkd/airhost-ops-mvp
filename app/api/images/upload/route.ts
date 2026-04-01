import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { canAssignedWorkerWriteOrder } from "@/lib/order-worker-access";
import { saveUpload } from "@/lib/upload";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const isWorker = session.user.role === "TJENESTE";
    const isLandlord = session.user.role === "UTLEIER";
    if (!isAdmin && !isWorker && !isLandlord) {
      return apiError(403, "Only admin/worker/landlord can upload files");
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File)
      .filter((file) => file.size > 0 && file.name.trim().length > 0);
    const fallbackFile = formData.get("file");
    if (files.length === 0 && fallbackFile instanceof File && fallbackFile.size > 0 && fallbackFile.name.trim().length > 0) {
      files.push(fallbackFile);
    }
    const orderId = String(formData.get("orderId") ?? "");
    const caption = String(formData.get("caption") ?? "");
    const kind = String(formData.get("kind") ?? "");

    if (files.length === 0 || !orderId) return apiError(400, "Missing file/orderId");
    for (const file of files) {
      if (file.size > 8 * 1024 * 1024) return apiError(413, "File too large (max 8MB)");
      if (!file.type.startsWith("image/")) return apiError(400, "Only image files are supported");
    }

    const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
    if (!order) return apiError(404, "Order not found");
    if (!isAdmin && isLandlord && order.landlordId !== session.user.id) {
      return apiError(403, "Not landlord for order");
    }
    if (!isAdmin && isWorker && order.assignedToId !== session.user.id) {
      return apiError(403, "Not assigned to order");
    }
    if (!isAdmin && isWorker && !canAssignedWorkerWriteOrder(order, session.user.id, false)) {
      return apiError(409, "You must press START before you can write or make changes in this job.", {
        code: "ORDER_NOT_STARTED",
      });
    }

    const uploaded = [];
    for (const file of files) {
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
      uploaded.push(image);
    }

    return NextResponse.json({ items: uploaded, count: uploaded.length }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
