import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { ADMIN_VIEW_COOKIE, resolveUserRole } from "@/lib/user-role";
import { apiError, handleApiError } from "@/lib/api";
import { modeSwitchSchema } from "@/lib/validators";

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();

    const body = await req.json();
    const data = modeSwitchSchema.parse(body);

    if (session.user.adminViewMode === "ADMIN" && data.mode === "ADMIN") {
      const resolved = await resolveUserRole(session.user.id, { adminViewMode: "ADMIN" });
      const response = NextResponse.json({ ...session.user, effectiveRole: resolved.role, adminViewMode: "ADMIN" });
      response.cookies.set(ADMIN_VIEW_COOKIE, "ADMIN", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
      return response;
    }

    if (session.user.accountRole === "ADMIN") {
      const adminMode = data.mode;
      const resolved = await resolveUserRole(session.user.id, { adminViewMode: adminMode });
      const response = NextResponse.json({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        canLandlord: true,
        canService: true,
        activeMode: resolved.activeMode,
        effectiveRole: resolved.role,
        adminViewMode: adminMode,
      });
      response.cookies.set(ADMIN_VIEW_COOKIE, adminMode, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
      return response;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canLandlord: true, canService: true },
    });

    if (!user) return apiError(404, "User not found");
    if (data.mode === "ADMIN") return apiError(400, "Invalid mode for non-admin user");

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        activeMode: data.mode,
        canLandlord: data.mode === "UTLEIER" ? true : user.canLandlord,
        canService: data.mode === "TJENESTE" ? true : user.canService,
      },
      select: {
        id: true,
        name: true,
        email: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
      },
    });

    const resolved = await resolveUserRole(session.user.id);
    return NextResponse.json({ ...updated, effectiveRole: resolved.role, adminViewMode: resolved.adminViewMode });
  } catch (error) {
    return handleApiError(error);
  }
}
