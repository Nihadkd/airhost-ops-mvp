"use client";

import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type ShareJobButtonProps = {
  urlPath: string;
  className?: string;
};

export function ShareJobButton({ urlPath, className = "btn btn-secondary px-3" }: ShareJobButtonProps) {
  const { t } = useLanguage();

  const onShare = async () => {
    if (typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}${urlPath}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t("appName"),
          text: t("shareJobAction"),
          url: shareUrl,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("jobLinkCopied"));
    } catch {
      toast.error(t("shareJobFailed"));
    }
  };

  return (
    <button
      type="button"
      className={className}
      onClick={() => void onShare()}
      aria-label={t("shareJobAction")}
      title={t("shareJobAction")}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
        <path d="M12 16V4" />
        <path d="m7 9 5-5 5 5" />
      </svg>
    </button>
  );
}
