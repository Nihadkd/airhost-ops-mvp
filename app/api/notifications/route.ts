import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { notificationCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unreadOnly") === "1";
    const limitRaw = Number(url.searchParams.get("limit") ?? "20");
    const limit = Number.isFinite(limitRaw) ? Math.min(50, Math.max(1, Math.floor(limitRaw))) : 20;
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id, ...(unreadOnly ? { isRead: false } : {}) },
      select: {
        id: true,
        message: true,
        isRead: true,
        actorUserId: true,
        targetUrl: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    if (!isAdmin && session.user.role !== "TJENESTE") {
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
