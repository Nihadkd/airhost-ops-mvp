import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireAuth();
    const count = await prisma.notification.count({
      where: {
        userId: session.user.id,
        isRead: false,
      },
    });
    return NextResponse.json({ count });
  } catch (error) {
    return handleApiError(error);
  }
}

