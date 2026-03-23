import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { AdminUsersClient } from "@/components/admin-users-client";

export default async function AdminUsersPage() {
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
  return (
    <section>
      <AdminUsersClient initialUsers={[]} />
    </section>
  );
}
