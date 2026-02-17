import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolveUserRole } from "@/lib/user-role";
import { TopNav } from "@/components/top-nav";
import { NotificationPopup } from "@/components/notification-popup";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let resolved;
  try {
    resolved = await resolveUserRole(session.user.id);
  } catch {
    redirect("/login");
  }

  return (
    <div className="pb-10">
      <TopNav
        initialMe={{
          name: session.user.name,
          effectiveRole: resolved.role,
          canLandlord: resolved.canLandlord,
          canService: resolved.canService,
          activeMode: resolved.activeMode,
        }}
      />
      <main className="mx-auto mt-4 w-[95%] max-w-6xl">{children}</main>
      <NotificationPopup />
    </div>
  );
}