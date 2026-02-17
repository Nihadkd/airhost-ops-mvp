import { Role } from "@prisma/client";
import { auth } from "@/lib/auth";
import { resolveUserRole } from "@/lib/user-role";

type SessionWithRole = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    canLandlord?: boolean;
    canService?: boolean;
    activeMode?: "UTLEIER" | "TJENESTE";
  };
};

export async function requireAuth(): Promise<SessionWithRole> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  const resolved = await resolveUserRole(session.user.id);

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: resolved.role,
      canLandlord: resolved.canLandlord,
      canService: resolved.canService,
      activeMode: resolved.activeMode,
    },
  };
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}