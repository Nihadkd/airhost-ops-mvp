import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { notificationCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    if (!["ADMIN", "TJENESTE"].includes(session.user.role)) {
      return apiError(403, "Only admin/worker can send notifications");
    }

    const body = await req.json();
    const data = notificationCreateSchema.parse(body);

    const notification = await prisma.notification.create({ data });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}