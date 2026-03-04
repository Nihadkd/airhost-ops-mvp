import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/rbac";
import { PricesPageContent } from "@/components/prices-page-content";

export default async function PricesPage() {
  try {
    await requireAuth();
  } catch {
    redirect("/login");
  }

  return <PricesPageContent />;
}

