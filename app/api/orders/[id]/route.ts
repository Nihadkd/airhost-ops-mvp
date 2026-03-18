import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { assignmentStatuses } from "@/lib/order-assignment";
import { canAssignedWorkerStartOrder, canAssignedWorkerWriteOrder } from "@/lib/order-worker-access";
import { getStartAvailabilityForWorker, startOrderForWorker } from "@/lib/services/order-start-service";
import { orderUpdateSchema } from "@/lib/validators";
import { sendOrderCompletedEmail } from "@/lib/email-notifications";
import { extractDeadlineAt, splitOrderNote, withDeadlineMetadata } from "@/lib/order-deadline";
import { notifyUserEvent } from "@/lib/user-event-notifications";

async function canView(orderId: string, userId: string, role: string, isAdminAccount: boolean) {
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, order: null };
  if (isAdminAccount || role === "ADMIN") return { ok: true, order };
  if (role === "UTLEIER" && order.landlordId === userId) return { ok: true, order };
  if (role === "TJENESTE" && order.assignedToId === userId) return { ok: true, order };
  if (
    role === "TJENESTE" &&
    order.assignedToId === null &&
    order.status === "PENDING" &&
    order.assignmentStatus === assignmentStatuses.UNASSIGNED
  ) {
    return { ok: true, order };
  }
  return { ok: false, order };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdminAccount = session.user.accountRole === "ADMIN";
    const { id } = await params;
    const access = await canView(id, session.user.id, session.user.role, isAdminAccount);
    if (!access.ok) return apiError(403, "Forbidden");

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        images: {
          include: {
            uploadedBy: { select: { id: true, name: true, role: true } },
            comments: { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) return apiError(404, "Order not found");
    const startAvailability =
      session.user.role === "TJENESTE" && order.assignedToId === session.user.id
        ? await getStartAvailabilityForWorker(order.id, session.user.id)
        : { canStart: false, blockedByOrderId: null, blockedByOrderNumber: null };

    const split = splitOrderNote(order.note);
    return NextResponse.json({
      ...order,
      note: split.note,
      deadlineAt: split.deadlineAt,
      canStart: startAvailability.canStart,
      startBlockedByOrderId: startAvailability.blockedByOrderId,
      startBlockedByOrderNumber: startAvailability.blockedByOrderNumber,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdminAccount = session.user.accountRole === "ADMIN";
    const { id } = await params;
    const access = await canView(id, session.user.id, session.user.role, isAdminAccount);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const body = await req.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const data: Record<string, unknown> = {};

    if (parsed.data.address && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.address = parsed.data.address;
    }
    if (parsed.data.type && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.type = parsed.data.type;
    }
    if (parsed.data.date && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.date = new Date(parsed.data.date);
    }
    if (parsed.data.note !== undefined && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.note = withDeadlineMetadata(parsed.data.note, extractDeadlineAt(access.order.note));
    }
    if (parsed.data.details !== undefined && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.details = parsed.data.details.trim();
    }
    if (parsed.data.guestCount !== undefined && (isAdminAccount || session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.guestCount = parsed.data.guestCount;
    }

    if (parsed.data.status) {
      if (isAdminAccount || session.user.role === "ADMIN") {
        data.status = parsed.data.status;
      }
      if (session.user.role === "TJENESTE" && access.order.assignedToId === session.user.id) {
        if (parsed.data.status === "IN_PROGRESS" && canAssignedWorkerStartOrder(access.order, session.user.id, false)) {
          const started = await startOrderForWorker({
            orderId: id,
            workerId: session.user.id,
          });
          return NextResponse.json(started);
        }
        if (parsed.data.status === "IN_PROGRESS") {
          if (access.order.assignmentStatus !== assignmentStatuses.CONFIRMED) {
            return apiError(409, "Job assignment is not fully approved yet.", {
              code: "ASSIGNMENT_NOT_CONFIRMED",
            });
          }
          return apiError(409, "Du må fullføre tidligere oppdrag før du kan starte dette.", {
            code: "WORKER_SEQUENCE_BLOCKED",
          });
        }
        if (parsed.data.status === "COMPLETED" && canAssignedWorkerWriteOrder(access.order, session.user.id, false)) {
          data.status = parsed.data.status;
          data.completionNote = parsed.data.completionNote ?? null;
          data.completionChecklist = parsed.data.completionChecklist ?? null;
        }
      }
    }

    const updated = await prisma.serviceOrder.update({ where: { id }, data });

    if (session.user.role === "TJENESTE" && parsed.data.status === "COMPLETED") {
      const doneMessage = `Oppdrag #${access.order.orderNumber} er utført og klart for betaling.`;
      const landlord = await prisma.user.findUnique({
        where: { id: access.order.landlordId },
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
          message: doneMessage,
          targetUrl: `/orders/${id}`,
          push: {
            title: "Oppdrag utført",
            body: doneMessage,
            data: { orderId: id, type: "order_completed", path: `/orders/${id}` },
          },
          email: () =>
            sendOrderCompletedEmail({
              to: { email: landlord.email, name: landlord.name },
              orderId: id,
              orderNumber: access.order.orderNumber,
            }),
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdminAccount = session.user.accountRole === "ADMIN";
    const { id } = await params;
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) return apiError(404, "Order not found");

    const canDelete =
      isAdminAccount ||
      session.user.role === "ADMIN" ||
      (session.user.role === "UTLEIER" && order.landlordId === session.user.id);
    if (!canDelete) return apiError(403, "Forbidden");

    await prisma.serviceOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
