"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export function FloatingMessageBubble() {
  const { t } = useLanguage();

  return (
    <Link
      href="/messages"
      aria-label={t("messages")}
      title={t("messages")}
      className="fixed bottom-24 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0b8f7b] text-white shadow-[0_10px_24px_rgba(11,143,123,0.45)] transition-transform hover:scale-105 md:bottom-5"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2C6.48 2 2 6.03 2 11c0 2.83 1.45 5.36 3.73 7.01V22l3.84-2.1c.79.22 1.61.34 2.43.34 5.52 0 10-4.03 10-9s-4.48-9-10-9Zm1.1 12.27-2.55-2.72-4.97 2.72 5.46-5.79 2.63 2.72 4.89-2.72-5.46 5.79Z"
          fill="currentColor"
        />
      </svg>
    </Link>
  );
}
