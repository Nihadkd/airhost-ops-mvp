import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { SettingsClient } from "@/components/settings-client";

export default async function SettingsPage() {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }

  return <SettingsClient />;
}
