"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type Me = {
  name: string;
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
};

export function TopNav({ initialMe }: { initialMe: Me }) {
  const router = useRouter();
  const [me, setMe] = useState<Me>(initialMe);
  const { lang, setLang, t } = useLanguage();

  const roleLabel: Record<string, string> = {
    ADMIN: t("roleAdmin"),
    UTLEIER: t("roleLandlord"),
    TJENESTE: t("roleWorker"),
  };

  const switchMode = async (mode: "UTLEIER" | "TJENESTE") => {
    const res = await fetch("/api/users/me/mode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (!res.ok) {
      toast.error("Kunne ikke bytte visning");
      return;
    }

    const meRes = await fetch("/api/users/me", { cache: "no-store" });
    if (meRes.ok) {
      setMe(await meRes.json());
    }

    toast.success("Visning oppdatert");
    router.refresh();
  };

  const effectiveRole = me.effectiveRole;

  return (
    <header className="panel mx-auto mt-4 w-[95%] max-w-6xl px-4 py-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{t("appName")}</p>
          <div className="flex items-center gap-2">
            <p className="font-bold">{me.name}</p>
            <span className="badge badge-progress">{roleLabel[effectiveRole] ?? effectiveRole}</span>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
          <select className="input max-w-24" value={lang} onChange={(e) => setLang(e.target.value as "no" | "en")}>
            <option value="no">NO</option>
            <option value="en">EN</option>
          </select>

          {me.canLandlord && me.canService && (
            <select
              className="input w-full md:max-w-56"
              value={me.activeMode}
              onChange={(e) => void switchMode(e.target.value as "UTLEIER" | "TJENESTE")}
            >
              <option value="UTLEIER">{t("viewAsLandlord")}</option>
              <option value="TJENESTE">{t("viewAsWorker")}</option>
            </select>
          )}

          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/dashboard" className="btn btn-secondary">{t("dashboard")}</Link>
            {(effectiveRole === "UTLEIER" || effectiveRole === "ADMIN") && (
              <Link href="/orders/new" className="btn btn-secondary">{t("newOrder")}</Link>
            )}
            <Link href="/profile" className="btn btn-secondary">{t("profile")}</Link>
            {effectiveRole === "ADMIN" && (
              <Link href="/admin/users" className="btn btn-secondary">{t("users")}</Link>
            )}
            <button className="btn btn-danger" onClick={() => signOut({ callbackUrl: "/login" })}>
              {t("logout")}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}
