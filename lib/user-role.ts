import { ProfileMode, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function resolveUserRole(userId: string): Promise<{ role: Role; canLandlord: boolean; canService: boolean; activeMode: ProfileMode }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, canLandlord: true, canService: true, activeMode: true },
  });

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  if (user.role === "ADMIN") {
    return { role: Role.ADMIN, canLandlord: true, canService: true, activeMode: ProfileMode.UTLEIER };
  }

  if (user.activeMode === "TJENESTE" && user.canService) {
    return { role: Role.TJENESTE, canLandlord: user.canLandlord, canService: user.canService, activeMode: user.activeMode };
  }

  if (user.canLandlord) {
    return { role: Role.UTLEIER, canLandlord: user.canLandlord, canService: user.canService, activeMode: user.activeMode };
  }

  return { role: Role.TJENESTE, canLandlord: user.canLandlord, canService: user.canService, activeMode: user.activeMode };
}