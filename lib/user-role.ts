import { ProfileMode, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminViewMode = "ADMIN" | "UTLEIER" | "TJENESTE";

export const ADMIN_VIEW_COOKIE = "servnest_admin_view";

export async function resolveUserRole(
  userId: string,
  opts?: { adminViewMode?: AdminViewMode },
): Promise<{ role: Role; canLandlord: boolean; canService: boolean; activeMode: ProfileMode; adminViewMode: AdminViewMode }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, canLandlord: true, canService: true, activeMode: true },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.role === "ADMIN") {
    const viewMode = opts?.adminViewMode ?? "ADMIN";
    if (viewMode === "UTLEIER") {
      return { role: Role.UTLEIER, canLandlord: true, canService: true, activeMode: ProfileMode.UTLEIER, adminViewMode: viewMode };
    }
    if (viewMode === "TJENESTE") {
      return { role: Role.TJENESTE, canLandlord: true, canService: true, activeMode: ProfileMode.TJENESTE, adminViewMode: viewMode };
    }
    return { role: Role.ADMIN, canLandlord: true, canService: true, activeMode: ProfileMode.UTLEIER, adminViewMode: viewMode };
  }

  if (user.activeMode === "TJENESTE" && user.canService) {
    return {
      role: Role.TJENESTE,
      canLandlord: user.canLandlord,
      canService: user.canService,
      activeMode: user.activeMode,
      adminViewMode: "UTLEIER",
    };
  }

  if (user.canLandlord) {
    return {
      role: Role.UTLEIER,
      canLandlord: user.canLandlord,
      canService: user.canService,
      activeMode: user.activeMode,
      adminViewMode: "UTLEIER",
    };
  }

  return {
    role: Role.TJENESTE,
    canLandlord: user.canLandlord,
    canService: user.canService,
    activeMode: user.activeMode,
    adminViewMode: "UTLEIER",
  };
}
