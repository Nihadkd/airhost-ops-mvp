"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { useLanguage } from "@/lib/language-context";

type Me = {
  name: string;
  accountRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
};

export function TopNav({ initialMe }: { initialMe: Me }) {
  const [me] = useState<Me>(initialMe);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t } = useLanguage();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const hasAdminAccess = me.accountRole === "ADMIN";
  const menuItems = useMemo(
    () => [
      { href: "/orders/my", label: t("myOrdersMenu"), show: true },
      { href: "/prices", label: t("prices"), show: true },
      { href: "/messages", label: t("messages"), show: true },
      { href: "/orders/new", label: t("newOrder"), show: hasAdminAccess || me.effectiveRole === "UTLEIER" || me.effectiveRole === "ADMIN" },
      { href: "/profile", label: `${t("profile")} (${me.name})`, show: true },
      { href: "/settings", label: t("settings"), show: true },
      { href: "/admin/users", label: t("users"), show: hasAdminAccess || me.effectiveRole === "ADMIN" },
    ],
    [hasAdminAccess, me.effectiveRole, me.name, t],
  );

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [menuOpen]);

  useEffect(() => {
    let mounted = true;

    const refreshUnreadCount = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (!mounted) return;
        const next = Number(data?.count ?? 0);
        setUnreadCount(Number.isFinite(next) && next > 0 ? next : 0);
      } catch {
        // Ignore transient errors.
      }
    };

    void refreshUnreadCount();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshUnreadCount();
      }
    }, 15000);
    const onFocus = () => void refreshUnreadCount();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      mounted = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  return (
    <header className="panel mx-auto mt-4 w-[95%] max-w-6xl px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="group inline-flex items-center gap-3 rounded-xl px-1 py-1 transition-colors hover:bg-slate-100"
          aria-label={t("home")}
          title={t("home")}
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"
                fill="currentColor"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-base font-black tracking-[0.12em] text-slate-800">
              <span className="text-teal-700">Se</span>rv<span className="text-teal-700">N</span>est
            </p>
          </div>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            className="btn btn-secondary px-3"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={t("menu")}
            title={t("menu")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <circle cx="8" cy="3" r="1.5" fill="currentColor" />
              <circle cx="8" cy="8" r="1.5" fill="currentColor" />
              <circle cx="8" cy="13" r="1.5" fill="currentColor" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">{t("menu")}</p>
              <nav className="space-y-1">
                {menuItems.filter((item) => item.show).map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span>{item.label}</span>
                    {item.href === "/messages" && unreadCount > 0 ? (
                      <span className="inline-flex min-w-[22px] items-center justify-center rounded-full bg-teal-700 px-2 py-0.5 text-xs font-bold text-white">
                        {unreadCount}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </nav>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <button className="btn btn-danger w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
                  {t("logout")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
