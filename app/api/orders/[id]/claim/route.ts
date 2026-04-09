import { NextResponse } from "next/server";
import { apiError, handleApiError } from "@/lib/api";
import { requireAuth } from "@/lib/rbac";
import { claimOrderForWorker } from "@/lib/services/order-claim-service";
import { orderIdParamSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { sendWorkerAcceptedAssignmentEmail } from "@/lib/email-notifications";
import { revalidatePublicJobListings } from "@/lib/public-job-cache";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
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
      await notifyUserEvent({
        recipient: {
          userId: landlord.id,
          email: landlord.email,
          name: landlord.name,
        },
        actorUserId: session.user.id,
        message: `${session.user.name || "Tjenesteutforer"} vil utfore oppdrag #${order.orderNumber}. Du ma godkjenne.`,
        targetUrl: `/orders/${order.id}`,
        push: {
          title: "Godkjenn tjenesteutforer",
          body: `${session.user.name || "Tjenesteutforer"} venter pa godkjenning for oppdrag #${order.orderNumber}.`,
          data: { orderId: order.id, type: "assignment_pending_landlord", path: `/orders/${order.id}` },
        },
        email: () =>
          sendWorkerAcceptedAssignmentEmail({
            to: { email: landlord.email, name: landlord.name },
            orderId: order.id,
            orderNumber: order.orderNumber,
            workerName: session.user.name || "Tjenesteutforer",
          }),
      });
    }

    revalidatePublicJobListings();
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}
