import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { ADMIN_VIEW_COOKIE, type AdminViewMode, resolveUserRole } from "@/lib/user-role";

type SessionWithRole = {
  user: {
    id: string;
    name: string;
    email: string;
    accountRole: Role;
    role: Role;
    canLandlord?: boolean;
    canService?: boolean;
    activeMode?: "UTLEIER" | "TJENESTE";
    adminViewMode?: "ADMIN" | "UTLEIER" | "TJENESTE";
  };
};

export async function requireAuth(opts?: { allowWithoutLegalConsent?: boolean }): Promise<SessionWithRole> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  let adminViewMode: AdminViewMode = "ADMIN";
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(ADMIN_VIEW_COOKIE)?.value;
    if (cookieValue === "ADMIN" || cookieValue === "UTLEIER" || cookieValue === "TJENESTE") {
      adminViewMode = cookieValue;
    }
  } catch {
    // Ignore cookie errors and fall back to ADMIN.
  }

  const resolved = await resolveUserRole(session.user.id, { adminViewMode });

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      accountRole: session.user.role as Role,
      role: resolved.role,
      canLandlord: resolved.canLandlord,
      canService: resolved.canService,
      activeMode: resolved.activeMode,
      adminViewMode: resolved.adminViewMode,
    },
  };
}

export async function requireRole(roles: Role[]) {
  const session = await requireAuth();
  if (session.user.accountRole === Role.ADMIN) {
    return session;
  }
  if (!roles.includes(session.user.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}
