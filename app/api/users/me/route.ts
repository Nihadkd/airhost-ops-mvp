import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
      },
    });

    return NextResponse.json({ ...user, effectiveRole: session.user.role });
  } catch (error) {
    return handleApiError(error);
  }
}