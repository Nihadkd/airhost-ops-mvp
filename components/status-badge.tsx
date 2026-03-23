"use client";

import { useLanguage } from "@/lib/language-context";

export function StatusBadge({
  status,
  className = "",
}: {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  className?: string;
}) {
  const { t } = useLanguage();

  if (status === "COMPLETED") return <span className={`badge badge-completed ${className}`.trim()}>{t("statusCompleted")}</span>;
  if (status === "IN_PROGRESS") return <span className={`badge badge-progress ${className}`.trim()}>{t("statusInProgress")}</span>;
  return <span className={`badge badge-pending ${className}`.trim()}>{t("statusPending")}</span>;
}
