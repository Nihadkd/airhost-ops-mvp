import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { contactUserSchema } from "@/lib/validators";
import { sendDirectContactEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (id === session.user.id) return apiError(400, "Cannot message yourself");

    const body = await req.json();
    const parsed = contactUserSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
    if (!target) return apiError(404, "User not found");

    const result = await notifyUserEvent({
      recipient: {
        userId: target.id,
        email: target.email,
        name: target.name,
      },
      actorUserId: session.user.id,
      message: `Ny melding fra ${session.user.name}: ${parsed.data.message}`,
      targetUrl: "/messages",
      push: {
        title: "Ny melding",
        body: `Ny melding fra ${session.user.name}`,
        data: { type: "direct_contact", path: "/messages" },
      },
      email: () =>
        sendDirectContactEmail({
          to: { email: target.email, name: target.name },
          fromName: session.user.name || "ServNest-bruker",
        }),
    });

    return NextResponse.json(result.notification, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
