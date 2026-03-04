import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { contactUserSchema } from "@/lib/validators";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (id === session.user.id) return apiError(400, "Cannot message yourself");

    const body = await req.json();
    const parsed = contactUserSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!target) return apiError(404, "User not found");

    const notification = await prisma.notification.create({
      data: {
        userId: id,
        actorUserId: session.user.id,
        message: `Ny melding fra ${session.user.name}: ${parsed.data.message}`,
        targetUrl: "/messages",
      },
    });
    await sendPushToUser(id, {
      title: "Ny melding",
      body: `Ny melding fra ${session.user.name}`,
      data: { type: "direct_contact", path: "/messages" },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
