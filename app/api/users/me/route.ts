import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { meProfileUpdateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const session = await requireAuth();
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
        mobileNotifications: true,
      },
    });

    return NextResponse.json({
      ...user,
      accountRole: session.user.accountRole,
      effectiveRole: session.user.role,
      adminViewMode: session.user.adminViewMode,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
    const body = await req.json();
    const parsed = meProfileUpdateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name.trim(),
        phone: parsed.data.phone ? parsed.data.phone.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
        mobileNotifications: true,
      },
    });

    return NextResponse.json({
      ...updated,
      accountRole: session.user.accountRole,
      effectiveRole: session.user.role,
      adminViewMode: session.user.adminViewMode,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { isActive: false, mobileNotifications: false },
    });
    await prisma.pushDeviceToken.updateMany({
      where: { userId: session.user.id, isActive: true },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
