 "use client";

import { useLanguage } from "@/lib/language-context";

export function StatusBadge({ status }: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" }) {
  const { t } = useLanguage();

  if (status === "COMPLETED") return <span className="badge badge-completed">{t("statusCompleted")}</span>;
  if (status === "IN_PROGRESS") return <span className="badge badge-progress">{t("statusInProgress")}</span>;
  return <span className="badge badge-pending">{t("statusPending")}</span>;
}
