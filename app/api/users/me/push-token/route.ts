import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { pushTokenSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const parsed = pushTokenSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const token = parsed.data.token.trim();
    const saved = await prisma.pushDeviceToken.upsert({
      where: { token },
      update: {
        userId: session.user.id,
        platform: parsed.data.platform,
        deviceName: parsed.data.deviceName,
        isActive: true,
      },
      create: {
        userId: session.user.id,
        token,
        platform: parsed.data.platform,
        deviceName: parsed.data.deviceName,
        isActive: true,
      },
    });
    console.info("[push-token] upsert_ok", {
      userId: session.user.id,
      platform: parsed.data.platform ?? "unknown",
      hasDeviceName: Boolean(parsed.data.deviceName),
    });

    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json().catch(() => null) as { token?: string } | null;
    const token = body?.token?.trim();
    if (!token) return apiError(400, "token is required");

    await prisma.pushDeviceToken.updateMany({
      where: { userId: session.user.id, token },
      data: { isActive: false },
    });
    console.info("[push-token] deactivate_ok", { userId: session.user.id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
