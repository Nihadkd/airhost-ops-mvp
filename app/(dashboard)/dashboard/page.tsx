import { redirect } from "next/navigation";
import { DashboardPageClient } from "@/components/dashboard-page-client";
import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  return <DashboardPageClient />;
}
