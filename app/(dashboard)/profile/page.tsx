import { redirect } from "next/navigation";
import { ProfileClient } from "@/components/profile-client";
import { requireAuth } from "@/lib/rbac";

export default async function ProfilePage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }

  return (
    <ProfileClient
      initialMe={{
        name: session.user.name,
        email: session.user.email,
        canLandlord: !!session.user.canLandlord,
        canService: !!session.user.canService,
        activeMode: session.user.activeMode ?? "UTLEIER",
        effectiveRole: session.user.role,
      }}
    />
  );
}