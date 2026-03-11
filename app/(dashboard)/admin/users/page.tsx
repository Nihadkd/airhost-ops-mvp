import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin-users-client";
import { getTranslation } from "@/lib/language-context";

export default async function AdminUsersPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }
  const userLanguage = (session.user as { language?: string }).language;
  const t = getTranslation(userLanguage === "en" ? "en" : "no");
  const hasAdminAccess = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
  if (!hasAdminAccess) {
    return (
      <section className="panel p-5">
        <h1 className="text-2xl font-bold">{t("noAccessTitle")}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {t("adminAccessRequired")} {t("accountRoleLabel")}: {session.user.accountRole}, {t("activeRoleLabel").toLowerCase()}: {session.user.role}.
        </p>
      </section>
    );
  }

  let users: Array<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: "ADMIN" | "UTLEIER" | "TJENESTE";
    isActive: boolean;
    canLandlord: boolean;
    canService: boolean;
    activeMode: "UTLEIER" | "TJENESTE";
    createdAt: Date;
    _count: {
      landlordOrders: number;
      assignedOrders: number;
      reviewsWritten: number;
      reviewsReceived: number;
      pushTokens: number;
    };
  }> = [];

  try {
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
        createdAt: true,
        _count: {
          select: {
            landlordOrders: true,
            assignedOrders: true,
            reviewsWritten: true,
            reviewsReceived: true,
            pushTokens: true,
          },
        },
      },
    });
  } catch (error) {
    console.error("[admin/users] load_failed", error);
    return (
      <section className="panel p-5">
        <h1 className="text-2xl font-bold">{t("fullUserOverviewTitle")}</h1>
        <p className="mt-2 text-sm text-red-600">Kunne ikke laste brukerliste akkurat na. Prov igjen om et oyeblikk.</p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="mb-1 text-2xl font-bold">{t("fullUserOverviewTitle")}</h1>
      <p className="mb-4 text-sm text-slate-600">{t("fullUserOverviewSubtitle")}</p>
      <AdminUsersClient initialUsers={users} />
    </section>
  );
}
