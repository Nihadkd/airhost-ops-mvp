import { redirect } from "next/navigation";

export default function CompletedOrdersRedirectPage() {
  redirect("/orders/my?status=completed");
}
