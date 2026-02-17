import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { modeSwitchSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();
    if (session.user.role === "ADMIN") {
      return apiError(400, "Admin has fixed admin mode");
    }

    const body = await req.json();
    const data = modeSwitchSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canLandlord: true, canService: true },
    });

    if (!user) return apiError(404, "User not found");
    if (data.mode === "UTLEIER" && !user.canLandlord) return apiError(403, "Landlord mode not enabled");
    if (data.mode === "TJENESTE" && !user.canService) return apiError(403, "Service mode not enabled");

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { activeMode: data.mode },
      select: {
        id: true,
        name: true,
        email: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}