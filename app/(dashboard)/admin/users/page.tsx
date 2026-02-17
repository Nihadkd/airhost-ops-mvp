import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminUsersClient } from "@/components/admin-users-client";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return (
    <section>
      <h1 className="mb-4 text-2xl font-bold">Brukeradministrasjon</h1>
      <AdminUsersClient initialUsers={users} />
    </section>
  );
}