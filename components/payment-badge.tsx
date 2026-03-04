"use client";

import { useLanguage } from "@/lib/language-context";

export function PaymentBadge({ status }: { status: "not_started" | "pending" | "paid" }) {
  const { t } = useLanguage();

  if (status === "paid") {
    return <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">{t("paymentStatusPaid")}</span>;
  }
  if (status === "pending") {
    return <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">{t("paymentStatusPending")}</span>;
  }
  return <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{t("paymentStatusNotStarted")}</span>;
}
