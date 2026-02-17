import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { orderUpdateSchema } from "@/lib/validators";

async function canView(orderId: string, userId: string, role: string) {
  const order = await prisma.serviceOrder.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, order: null };
  if (role === "ADMIN") return { ok: true, order };
  if (role === "UTLEIER" && order.landlordId === userId) return { ok: true, order };
  if (role === "TJENESTE" && order.assignedToId === userId) return { ok: true, order };
  if (role === "TJENESTE" && order.assignedToId === null && order.status === "PENDING") return { ok: true, order };
  return { ok: false, order };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const access = await canView(id, session.user.id, session.user.role);
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
        messages: {
          include: {
            sender: { select: { id: true, name: true, role: true } },
            recipient: { select: { id: true, name: true, role: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) return apiError(404, "Order not found");
    return NextResponse.json(order);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const access = await canView(id, session.user.id, session.user.role);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const body = await req.json();
    const parsed = orderUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const data: Record<string, unknown> = {};

    if (parsed.data.address && (session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.address = parsed.data.address;
    }
    if (parsed.data.date && (session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.date = new Date(parsed.data.date);
    }
    if (parsed.data.note !== undefined && (session.user.role === "ADMIN" || session.user.role === "UTLEIER")) {
      data.note = parsed.data.note;
    }

    if (parsed.data.status) {
      if (session.user.role === "ADMIN") {
        data.status = parsed.data.status;
      }
      if (
        session.user.role === "TJENESTE" &&
        access.order.assignedToId === session.user.id &&
        ["IN_PROGRESS", "COMPLETED"].includes(parsed.data.status)
      ) {
        data.status = parsed.data.status;
      }
    }

    const updated = await prisma.serviceOrder.update({ where: { id }, data });

    if (session.user.role === "TJENESTE" && parsed.data.status === "COMPLETED") {
      await prisma.notification.create({
        data: {
          userId: access.order.landlordId,
          message: "Oppdrag er markert som utført.",
        },
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const order = await prisma.serviceOrder.findUnique({ where: { id } });
    if (!order) return apiError(404, "Order not found");

    const canDelete = session.user.role === "ADMIN" || (session.user.role === "UTLEIER" && order.landlordId === session.user.id && order.status === "PENDING");
    if (!canDelete) return apiError(403, "Forbidden");

    await prisma.serviceOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
