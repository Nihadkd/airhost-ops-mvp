import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

export async function PUT(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const notification = await prisma.notification.findUnique({ where: { id } });

    if (!notification || notification.userId !== session.user.id) {
      return apiError(404, "Notification not found");
    }

    const updated = await prisma.notification.update({ where: { id }, data: { isRead: true } });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}