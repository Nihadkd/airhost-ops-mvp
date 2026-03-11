import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { AdminLabClient } from "@/components/admin-lab-client";

export default async function AdminLabPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const hasAdminAccess = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
  if (!hasAdminAccess) {
    redirect("/dashboard");
  }

  const [users, orders] = await Promise.all([
    prisma.user.findMany({
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
      },
    }),
    prisma.serviceOrder.findMany({
      orderBy: { date: "desc" },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        address: true,
        date: true,
        status: true,
        type: true,
        landlordId: true,
        assignedToId: true,
      },
    }),
  ]);

  return <AdminLabClient initialUsers={users} initialOrders={orders} />;
}
