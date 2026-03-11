import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { requireAuth } from "@/lib/rbac";
import { claimOrderForWorker } from "@/lib/services/order-claim-service";
import { orderIdParamSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { sendOrderClaimedEmail } from "@/lib/email-notifications";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    if (!isAdmin && session.user.role !== "TJENESTE") {
      return apiError(403, "Only worker can claim jobs");
    }

    const parsedParams = orderIdParamSchema.safeParse(await params);
    if (!parsedParams.success) {
      return apiError(400, "Invalid order id");
    }

    const { order } = await claimOrderForWorker({
      orderId: parsedParams.data.id,
      workerId: session.user.id,
      workerName: session.user.name,
    });

    const landlord = await prisma.user.findUnique({
      where: { id: order.landlordId },
      select: { id: true, email: true, name: true },
    });
    if (landlord) {
      await sendOrderClaimedEmail({
        to: { email: landlord.email, name: landlord.name },
        orderId: order.id,
        orderNumber: order.orderNumber,
        workerName: session.user.name || "Tjenesteutfører",
      });
    }

    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
