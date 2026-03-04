import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const session = await requireAuth();
    const [user, tokens] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          mobileNotifications: true,
          updatedAt: true,
        },
      }),
      prisma.pushDeviceToken.findMany({
        where: { userId: session.user.id },
        orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
        select: {
          token: true,
          platform: true,
          deviceName: true,
          isActive: true,
          updatedAt: true,
          createdAt: true,
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      mobileNotifications: user?.mobileNotifications ?? false,
      activeTokenCount: tokens.filter((item) => item.isActive).length,
      latestTokenAt: tokens[0]?.updatedAt ?? null,
      devices: tokens.map((item) => ({
        platform: item.platform ?? "unknown",
        deviceName: item.deviceName ?? null,
        isActive: item.isActive,
        updatedAt: item.updatedAt,
        createdAt: item.createdAt,
        tokenPreview:
          item.token.length > 16 ? `${item.token.slice(0, 8)}...${item.token.slice(-8)}` : item.token,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
