import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        mobileNotifications: parsed.data.mobileNotifications,
        phone: parsed.data.phone,
      },
      select: {
        id: true,
        mobileNotifications: true,
        phone: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

