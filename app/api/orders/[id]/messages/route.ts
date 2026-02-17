import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { messageCreateSchema } from "@/lib/validators";

async function getOrderIfParticipant(orderId: string, userId: string) {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { id: true, landlordId: true, assignedToId: true },
  });
  if (!order) return { ok: false as const, order: null };

  const isParticipant = order.landlordId === userId || order.assignedToId === userId;
  if (!isParticipant) return { ok: false as const, order };

  return { ok: true as const, order };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.user.role === "ADMIN") return apiError(403, "Only landlord/worker can access chat");

    const { id } = await params;
    const access = await getOrderIfParticipant(id, session.user.id);
    if (!access.ok) return apiError(403, "Forbidden");

    const messages = await prisma.message.findMany({
      where: { orderId: id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    });

    return NextResponse.json(messages, {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.user.role === "ADMIN") return apiError(403, "Only landlord/worker can send chat messages");

    const { id } = await params;
    const access = await getOrderIfParticipant(id, session.user.id);
    if (!access.ok || !access.order) return apiError(403, "Forbidden");

    const body = await req.json();
    const parsed = messageCreateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const recipientId =
      access.order.landlordId === session.user.id ? access.order.assignedToId : access.order.landlordId;
    if (!recipientId) return apiError(409, "No recipient available yet for this order");

    const message = await prisma.message.create({
      data: {
        orderId: id,
        senderId: session.user.id,
        recipientId,
        text: parsed.data.text,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
        recipient: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.notification.create({
      data: {
        userId: recipientId,
        message: "Du har fått en ny melding i oppdragschatten.",
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
