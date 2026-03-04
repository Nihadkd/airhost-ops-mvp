import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { OrderCreateForm } from "@/components/order-create-form";

export default async function NewOrderPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
  const landlordOptions = isAdmin
    ? await prisma.user.findMany({
        where: { isActive: true, canLandlord: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true },
      })
    : [];

  return <OrderCreateForm canChooseLandlord={isAdmin} landlordOptions={landlordOptions} />;
}
