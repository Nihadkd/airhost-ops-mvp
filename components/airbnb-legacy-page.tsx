"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { PaymentBadge } from "@/components/payment-badge";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";

type AirbnbJob = {
  id: string;
  orderNumber: number;
  address: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  note: string | null;
  details: string | null;
  guestCount: number | null;
  landlord: { name: string };
};

type Me = {
  name: string;
  accountRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
};

type SortMode = "NEWEST" | "OLDEST" | "SOONEST";

export function AirbnbLegacyPage({
  jobs,
  isAuthenticated = false,
  me = null,
}: {
  jobs: AirbnbJob[];
  isAuthenticated?: boolean;
  me?: Me | null;
}) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-GB";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasAdminAccess = me?.accountRole === "ADMIN";

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (!normalizedQuery) return true;
        return (
          job.address.toLowerCase().includes(normalizedQuery) ||
          (job.note ?? "").toLowerCase().includes(normalizedQuery) ||
          (job.details ?? "").toLowerCase().includes(normalizedQuery) ||
          job.landlord.name.toLowerCase().includes(normalizedQuery)
        );
      })
      .sort((left, right) => {
        const leftDate = new Date(left.date).getTime();
        const rightDate = new Date(right.date).getTime();
        const leftCreated = new Date(left.createdAt).getTime();
        const rightCreated = new Date(right.createdAt).getTime();

        if (sortMode === "OLDEST") return leftCreated - rightCreated;
        if (sortMode === "SOONEST") return leftDate - rightDate;
        return rightCreated - leftCreated;
      });
  }, [jobs, query, sortMode]);

  const menuItems = useMemo(
    () =>
      me
        ? [
            { href: "/orders/my", label: t("myOrdersMenu"), show: true },
            { href: "/prices", label: t("prices"), show: true },
            { href: "/messages", label: t("messages"), show: true },
            { href: "/orders/new", label: t("newOrder"), show: hasAdminAccess || me.effectiveRole === "UTLEIER" || me.effectiveRole === "ADMIN" },
            { href: "/profile", label: `${t("profile")} (${me.name})`, show: true },
            { href: "/settings", label: t("settings"), show: true },
            { href: "/admin/users", label: t("users"), show: hasAdminAccess || me.effectiveRole === "ADMIN" },
            { href: "/admin/lab", label: t("adminLab"), show: hasAdminAccess || me.effectiveRole === "ADMIN" },
          ]
        : [],
    [hasAdminAccess, me, t],
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
    if (!isAuthenticated) return;
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
  }, [isAuthenticated]);

  const mapUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-3 pb-12 pt-3 sm:px-4 lg:px-6">
      <div className="mx-auto w-full max-w-[1800px] space-y-6">
        <header className="panel rounded-[28px] px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="group inline-flex items-center gap-4 rounded-xl px-2 py-2 transition-colors hover:bg-slate-100"
              aria-label="ServNest"
            >
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b8f7b,#12303d)] text-white shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-base font-black uppercase tracking-[0.28em] text-teal-700">ServNest</p>
                <p className="text-xs font-semibold text-slate-500">Finn hjelp i nabolaget</p>
              </div>
            </Link>

            {isAuthenticated && me ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-slate-100 text-slate-700"
                  aria-label={t("menu")}
                  title={t("menu")}
                  onClick={() => setMenuOpen((prev) => !prev)}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
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
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link href="/login" className="btn btn-secondary">
                  Logg inn
                </Link>
                <Link href="/orders/new" className="btn btn-primary">
                  Legg ut jobb
                </Link>
              </div>
            )}
          </div>
        </header>

        <section className="panel rounded-[28px] px-6 py-6">
          <div className="max-w-5xl space-y-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Airbnb rengjøring i Oslo
              </h1>
              <p className="text-lg font-medium leading-8 text-slate-900">
                ServNest tilbyr profesjonell Airbnb rengjøring i Oslo for utleiere som ønsker en enkel og trygg løsning
                mellom gjester.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xl font-bold text-slate-900">Hva inkluderer Airbnb rengjøring?</h2>
                <ul className="mt-4 space-y-3 text-base text-slate-700">
                  <li>Rengjøring av bad og kjøkken</li>
                  <li>Støvsuging og vask av alle rom</li>
                  <li>Bytte av sengetøy og håndklær</li>
                  <li>Klargjøring for neste gjest</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-teal-200 bg-teal-50 p-5">
                <h2 className="text-xl font-bold text-slate-900">Hvorfor velge ServNest?</h2>
                <ul className="mt-4 space-y-3 text-base text-slate-700">
                  <li>Rask respons</li>
                  <li>Pålitelig levering</li>
                  <li>Erfaring med Airbnb utleie</li>
                  <li>Høy kvalitet hver gang</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-2xl font-black text-slate-900">Bestill Airbnb rengjøring i Oslo</h2>
              <p className="mt-3 text-base leading-7 text-slate-700">
                Trenger du hjelp med Airbnb rengjøring i Oslo?
              </p>
              <p className="text-base leading-7 text-slate-700">Ta kontakt med oss i dag.</p>
            </div>
          </div>
        </section>

        <section className="panel rounded-[28px] p-5">
          <p className="text-[1.2rem] font-medium text-slate-900">Filter</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[36rem_minmax(0,1fr)]">
            <select
              className="input h-[50px] rounded-[16px] px-5 text-[1rem]"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="NEWEST">Nyest til eldst</option>
              <option value="OLDEST">Eldst til nyest</option>
              <option value="SOONEST">Snarest</option>
            </select>
            <input
              className="input h-[50px] rounded-[16px] px-5 text-[1rem]"
              placeholder="Søk i oppdrag..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </section>

        <section className="panel rounded-[28px] p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h1 className="text-[1.75rem] font-medium text-slate-900">Oppdrag</h1>
            <Link href="/orders/new" className="btn btn-primary h-[34px] rounded-[12px] px-4 text-[0.8rem] font-semibold">
              Ny bestilling
            </Link>
          </div>

          <div className="hidden lg:block">
            <table className="w-full table-fixed text-left">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[16%]" />
                <col className="w-[23%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
                <col className="w-[13%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-teal-200 text-[0.82rem] font-semibold text-slate-900">
                  <th className="pb-1.5 pr-4">ID-nummer</th>
                  <th className="pb-1.5 pr-4">Type</th>
                  <th className="pb-1.5 pr-4">Adresse</th>
                  <th className="pb-1.5 pr-4">Utleiere</th>
                  <th className="pb-1.5 pr-4">Ansvarlig</th>
                  <th className="pb-1.5 pr-4">Dato utlyst</th>
                  <th className="pb-1.5 pr-4">Dato utført</th>
                  <th className="pb-1.5 pr-4">Status</th>
                  <th className="pb-1.5">Betaling</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.length === 0 && (
                  <tr>
                    <td className="py-7 text-slate-500" colSpan={9}>
                      Ingen Airbnb-oppdrag matcher filtrene akkurat nå.
                    </td>
                  </tr>
                )}
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="cursor-pointer border-b border-teal-200 bg-[#f3fbfa] align-top transition hover:bg-[#edf8f7]"
                    onClick={() => {
                      window.location.href = `/oppdrag/${job.id}`;
                    }}
                  >
                    <td className="py-1 pr-4 text-[0.82rem] font-semibold text-slate-900">#{job.orderNumber}</td>
                    <td className="py-1 pr-4 text-[0.82rem] text-slate-900">Airbnb tjenester</td>
                    <td className="py-1 pr-4 text-[0.82rem] text-slate-900">
                      <div className="break-words">{job.address}</div>
                      <a
                        href={mapUrl(job.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 inline-flex items-center rounded-[10px] border border-teal-400 bg-[#d5fbf4] px-2 py-[0.15rem] text-[0.72rem] font-semibold text-teal-900 shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Kart
                      </a>
                    </td>
                    <td className="py-1 pr-4 text-[0.82rem] font-semibold text-slate-900">{job.landlord.name}</td>
                    <td className="py-1 pr-4 text-[0.82rem] text-slate-900">-</td>
                    <td className="py-1 pr-4 text-[0.82rem] text-slate-900">
                      {new Date(job.date).toLocaleString(locale, { hour12: false })}
                    </td>
                    <td className="py-1 pr-4 text-[0.82rem] text-slate-900">-</td>
                    <td className="py-1 pr-4">
                      <StatusBadge status="PENDING" className="px-2 py-[0.12rem] text-[0.65rem]" />
                    </td>
                    <td className="py-1">
                      <PaymentBadge status="not_started" className="px-2 py-[0.12rem] text-[0.65rem]" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 lg:hidden">
            {filteredJobs.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                Ingen Airbnb-oppdrag matcher filtrene akkurat nå.
              </div>
            )}
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/oppdrag/${job.id}`}
                className="block rounded-2xl border border-teal-200 bg-[#f3fbfa] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">#{job.orderNumber}</p>
                    <p className="text-base text-slate-900">Airbnb tjenester</p>
                  </div>
                  <StatusBadge status="PENDING" />
                </div>
                <p className="mt-3 text-base font-semibold text-slate-900">{job.note ?? "Airbnb tjenester"}</p>
                <a
                  href={mapUrl(job.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2 inline-flex items-center rounded-[10px] border border-teal-400 bg-[#d5fbf4] px-2.5 py-[0.2rem] text-[0.8rem] font-semibold text-teal-900 shadow-sm"
                >
                  Kart
                </a>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <PaymentBadge status="not_started" />
                  <p className="text-sm text-slate-600">
                    {new Date(job.date).toLocaleString(locale, { hour12: false })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
