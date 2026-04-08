"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { inferCity, inferCounty, NORWEGIAN_COUNTIES } from "@/lib/public-job-presentation";
import { appendReturnTo } from "@/lib/return-to";
import {
  getServiceTypeTranslationKey,
  matchesServiceTypeSearchQuery,
  normalizeSearchText,
  ORDERABLE_SERVICE_TYPES,
  splitSearchTerms,
} from "@/lib/service-types";

type PublicJob = {
  id: string;
  orderNumber: number;
  type: string;
  address: string;
  date: string;
  note: string | null;
};

type Me = {
  name: string;
  accountRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
};

type SortMode = "SOONEST" | "NEWEST" | "OLDEST";
const DEFAULT_QUERY = "";
const DEFAULT_TYPE = "ALL";
const DEFAULT_COUNTY: (typeof NORWEGIAN_COUNTIES)[number] = "Alle fylker";
const DEFAULT_SORT_MODE: SortMode = "SOONEST";
const FEATURED_CITY_GROUPS = [
  {
    label: "Storbyer",
    cities: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Kristiansand", "Tromso"],
  },
  {
    label: "Flere byer",
    cities: ["Drammen", "Fredrikstad", "Sandnes", "Lillestrom", "Alesund", "Bodo"],
  },
] as const;

function formatPublicJobDate(dateValue: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Oslo",
  }).format(new Date(dateValue));
}

function parseQueryParam(value: string | null) {
  return value?.trim() ?? DEFAULT_QUERY;
}

function parseTypeParam(value: string | null) {
  if (value === DEFAULT_TYPE) {
    return DEFAULT_TYPE;
  }

  return value && ORDERABLE_SERVICE_TYPES.includes(value as (typeof ORDERABLE_SERVICE_TYPES)[number]) ? value : DEFAULT_TYPE;
}

function parseCountyParam(value: string | null) {
  return value && (NORWEGIAN_COUNTIES as readonly string[]).includes(value)
    ? (value as (typeof NORWEGIAN_COUNTIES)[number])
    : DEFAULT_COUNTY;
}

function parseSortParam(value: string | null): SortMode {
  return value === "NEWEST" || value === "OLDEST" || value === "SOONEST" ? value : DEFAULT_SORT_MODE;
}

function CategoryIcon({ type }: { type: string }) {
  const iconClassName = "h-6 w-6 sm:h-7 sm:w-7";

  switch (type) {
    case "CLEANING":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.5 4h6.8l4.2.5v2l-2.8.4v.9l-2.7.2 1.2 2.2c.6 1.2.9 2.4.9 3.7v5.8l-1 1H8.8l-1-.9v-6c0-1.4.3-2.7.9-3.9l1.6-3V6.5H8.5V4Zm2.4 2.2h3.8m-3 11.3h.1m-.1-7.8c-.5.9-.8 1.9-.8 2.9v5.6m5.2-7.9c.4.9.6 1.8.6 2.8v5.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "MOVING_CARRYING":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 8h11l3 3h4v5h-2a2 2 0 1 1-4 0H9a2 2 0 1 1-4 0H3V8Zm11 0v3h3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "GARDEN_WORK":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 20V9m0 0c-3 0-5-2-5-5 3 0 5 2 5 5Zm0 0c3 0 5-2 5-5-3 0-5 2-5 5Zm-5 9h10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "DELIVERY_TRANSPORT":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h10v8H4V7Zm10 2h3l3 3v3h-6V9Zm-7 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "SMALL_REPAIRS":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M14.8 5.2a3.8 3.8 0 0 0-4.7 4.7l-5.4 5.4a1.5 1.5 0 1 0 2.1 2.1l5.4-5.4a3.8 3.8 0 0 0 4.7-4.7l-2 2-2.2-2.2 2.1-1.9Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="6.1" cy="17.9" r="0.9" fill="currentColor" />
        </svg>
      );
    case "PET_CARE":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 11c-1.4 0-2-1.2-2-2.5S5.8 6 7 6s2 1.2 2 2.5S8.4 11 7 11Zm10 0c-1.4 0-2-1.2-2-2.5S15.8 6 17 6s2 1.2 2 2.5-0.6 2.5-2 2.5ZM12 8c-1.4 0-2-1.2-2-2.5S10.8 3 12 3s2 1.2 2 2.5S13.4 8 12 8Zm-4.5 10c0-2.5 2.2-4.5 4.5-4.5s4.5 2 4.5 4.5c0 1.1-0.9 2-2 2h-5c-1.1 0-2-0.9-2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "TECHNICAL_HELP":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm7 3-1.4-.4a5.9 5.9 0 0 0-.6-1.4l.7-1.3-1.4-1.4-1.3.7a5.9 5.9 0 0 0-1.4-.6L12.5 5h-2l-.4 1.4a5.9 5.9 0 0 0-1.4.6l-1.3-.7L6 7.7l.7 1.3a5.9 5.9 0 0 0-.6 1.4L4.7 12l.4 2 1.4.4c.1.5.3 1 .6 1.4L6.4 17l1.4 1.4 1.3-.7c.4.3.9.5 1.4.6l.4 1.4h2l.4-1.4c.5-.1 1-.3 1.4-.6l1.3.7 1.4-1.4-.7-1.3c.3-.4.5-.9.6-1.4l1.4-.4.1-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "KEY_HANDLING":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 8a4 4 0 1 0-3.9 4.9L12 14h2l1 1h2l1 1h2v-2l-1-1v-2l-1-1-1.1-1.1A4 4 0 0 0 15 8Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12h.01M12 12h.01M18 12h.01M5 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm6 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z" fill="currentColor" />
        </svg>
      );
  }
}

export function PublicHomePage({
  jobs,
  isAuthenticated = false,
  me = null,
}: {
  jobs: PublicJob[];
  isAuthenticated?: boolean;
  me?: Me | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = useMemo(() => parseQueryParam(searchParams.get("q")), [searchParams]);
  const selectedTypeFromUrl = useMemo(() => parseTypeParam(searchParams.get("type")), [searchParams]);
  const selectedCountyFromUrl = useMemo(() => parseCountyParam(searchParams.get("county")), [searchParams]);
  const sortModeFromUrl = useMemo(() => parseSortParam(searchParams.get("sort")), [searchParams]);
  const [query, setQuery] = useState(queryFromUrl);
  const [selectedType, setSelectedType] = useState<string>(selectedTypeFromUrl);
  const [selectedCounty, setSelectedCounty] = useState<string>(selectedCountyFromUrl);
  const [sortMode, setSortMode] = useState<SortMode>(sortModeFromUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-GB";
  const menuRef = useRef<HTMLDivElement | null>(null);
  const hasAdminAccess = me?.accountRole === "ADMIN";
  const canOpenJobDirectly =
    isAuthenticated && Boolean(me && (me.accountRole === "ADMIN" || me.effectiveRole === "ADMIN" || me.effectiveRole === "TJENESTE"));
  const currentListHref = useMemo(() => {
    const nextParams = new URLSearchParams();
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      nextParams.set("q", normalizedQuery);
    }
    if (selectedType !== DEFAULT_TYPE) {
      nextParams.set("type", selectedType);
    }
    if (selectedCounty !== DEFAULT_COUNTY) {
      nextParams.set("county", selectedCounty);
    }
    if (sortMode !== DEFAULT_SORT_MODE) {
      nextParams.set("sort", sortMode);
    }

    const nextSearch = nextParams.toString();
    return `${pathname}${nextSearch ? `?${nextSearch}` : ""}#ledige-oppdrag`;
  }, [pathname, query, selectedCounty, selectedType, sortMode]);
  const getJobHref = (jobId: string) =>
    appendReturnTo(canOpenJobDirectly ? `/orders/${jobId}` : `/oppdrag/${jobId}`, currentListHref);

  const categories = useMemo(() => {
    return ORDERABLE_SERVICE_TYPES.map((type) => {
      const translationKey = getServiceTypeTranslationKey(type);
      return {
        type,
        label: translationKey ? t(translationKey) : type,
      };
    });
  }, [t]);

  const filteredJobs = useMemo(() => {
    const queryTerms = splitSearchTerms(query);

    return jobs
      .filter((job) => {
        if (selectedType !== "ALL" && job.type !== selectedType) {
          return false;
        }

        if (selectedCounty !== "Alle fylker" && inferCounty(job.address) !== selectedCounty) {
          return false;
        }

        if (queryTerms.length === 0) {
          return true;
        }

        const translationKey = getServiceTypeTranslationKey(job.type);
        const typeLabel = translationKey ? t(translationKey) : job.type;
        const normalizedFields = [
          normalizeSearchText(job.address),
          normalizeSearchText(typeLabel),
          normalizeSearchText(job.note ?? ""),
          normalizeSearchText(inferCounty(job.address)),
          normalizeSearchText(inferCity(job.address)),
          normalizeSearchText(String(job.orderNumber)),
        ];

        return queryTerms.every((term) => {
          const normalizedTerm = normalizeSearchText(term);
          return (
            normalizedFields.some((field) => field.includes(normalizedTerm)) ||
            matchesServiceTypeSearchQuery(job.type, term)
          );
        });
      })
      .sort((left, right) => {
        const leftTime = new Date(left.date).getTime();
        const rightTime = new Date(right.date).getTime();

        if (sortMode === "NEWEST") {
          return rightTime - leftTime;
        }

        if (sortMode === "OLDEST") {
          return leftTime - rightTime;
        }

        return leftTime - rightTime;
      });
  }, [jobs, query, selectedCounty, selectedType, sortMode, t]);

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
    const syncHandle = window.setTimeout(() => {
      setQuery((current) => (current === queryFromUrl ? current : queryFromUrl));
      setSelectedType((current) => (current === selectedTypeFromUrl ? current : selectedTypeFromUrl));
      setSelectedCounty((current) => (current === selectedCountyFromUrl ? current : selectedCountyFromUrl));
      setSortMode((current) => (current === sortModeFromUrl ? current : sortModeFromUrl));
    }, 0);

    return () => window.clearTimeout(syncHandle);
  }, [queryFromUrl, selectedCountyFromUrl, selectedTypeFromUrl, sortModeFromUrl]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    const normalizedQuery = query.trim();

    if (normalizedQuery) {
      nextParams.set("q", normalizedQuery);
    } else {
      nextParams.delete("q");
    }

    if (selectedType !== DEFAULT_TYPE) {
      nextParams.set("type", selectedType);
    } else {
      nextParams.delete("type");
    }

    if (selectedCounty !== DEFAULT_COUNTY) {
      nextParams.set("county", selectedCounty);
    } else {
      nextParams.delete("county");
    }

    if (sortMode !== DEFAULT_SORT_MODE) {
      nextParams.set("sort", sortMode);
    } else {
      nextParams.delete("sort");
    }

    const currentSearch = searchParams.toString();
    const nextSearch = nextParams.toString();

    if (currentSearch === nextSearch) return;
    window.history.replaceState(window.history.state, "", nextSearch ? `${pathname}?${nextSearch}` : pathname);
  }, [pathname, query, searchParams, selectedCounty, selectedType, sortMode]);

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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-3 pb-12 pt-4 sm:px-6 sm:pb-16 sm:pt-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="relative z-[80] flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-white/70 bg-white/80 px-4 py-3 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:gap-4 sm:rounded-[28px] sm:px-7 sm:py-4">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="ServNest">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b8f7b,#12303d)] text-white shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="currentColor" />
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
        </header>

        <section className="relative mt-4 overflow-hidden rounded-[28px] border border-[#d7e7ea] bg-[radial-gradient(circle_at_top,#f8fffd_0%,#ecf6f7_40%,#f8fbfc_100%)] px-4 py-5 shadow-[0_28px_90px_rgba(15,48,61,0.12)] sm:mt-6 sm:rounded-[36px] sm:px-10 sm:py-12">
          <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-teal-200/35 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" aria-hidden="true" />

          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.9fr] lg:items-center lg:gap-8">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Lokale oppdrag. Rask hjelp. Trygg flyt.</p>
              <h1 className="mt-3 max-w-3xl text-[2.35rem] font-black leading-[0.98] text-slate-900 sm:mt-4 sm:text-[4.1rem]">
                Hjelp og oppdrag, samlet på ett sted
              </h1>
              <p className="mt-3 max-w-2xl text-[0.98rem] leading-7 text-slate-600 sm:mt-5 sm:text-lg">
                Fra små oppdrag til større behov, ServNest kobler folk som trenger hjelp med folk som kan hjelpe.
              </p>

              <label htmlFor="public-search" className="sr-only">
                Søk etter oppdrag
              </label>
              <div className="mt-5 max-w-4xl sm:mt-7">
                <div className="panel flex items-center gap-3 rounded-[22px] border border-white/80 bg-white/96 px-3 py-2.5 shadow-[0_24px_60px_rgba(11,143,123,0.10)] sm:rounded-[28px] sm:px-6 sm:py-5">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 sm:h-11 sm:w-11 sm:rounded-2xl">
                    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    id="public-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Søk etter ledige oppdrag, sted eller tjeneste"
                    className="w-full border-0 bg-transparent text-base font-semibold text-slate-900 outline-none placeholder:text-slate-400 sm:text-[1.35rem]"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2.5 sm:mt-6 sm:gap-3">
                <Link href="#ledige-oppdrag" className="btn btn-secondary px-6">
                  Finn oppdrag
                </Link>
                <Link href="/orders/new" className="btn btn-primary px-6">
                  Legg ut jobb
                </Link>
              </div>
              <Link href="/tjenester" className="mt-3 inline-flex text-sm font-black text-teal-700 underline underline-offset-4">
                Se alle tjenestene vi dekker
              </Link>
              {!isAuthenticated ? (
                <p className="mt-2 text-sm font-medium text-slate-500 sm:mt-3">
                  Innlogging kreves når du skal legge ut eller påta deg en jobb.
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:gap-4">
              <div className="rounded-[24px] border border-white/80 bg-[linear-gradient(180deg,rgba(15,48,61,0.97),rgba(11,143,123,0.94))] p-4 text-white shadow-[0_26px_60px_rgba(15,48,61,0.18)] sm:rounded-[30px] sm:p-6">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">Slik fungerer det</p>
                <div className="mt-4 space-y-3 sm:mt-5 sm:space-y-4">
                  {[
                    { title: "Søk eller filtrer", text: "Finn oppdrag etter kategori, område eller tidspunkt." },
                    { title: "Velg riktig oppdrag", text: "Se detaljer før du bestemmer deg for å gå videre." },
                    { title: "Logg inn når du handler", text: "Innlogging kreves først når du vil ta eller legge ut jobb." },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[18px] border border-white/10 bg-white/8 px-3 py-3 backdrop-blur sm:rounded-[22px] sm:px-4 sm:py-4">
                      <div>
                        <p className="text-[18px] font-black text-white sm:text-[20px]">{item.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <div className="max-w-4xl rounded-[24px] border border-white/80 bg-white/90 px-5 py-5 shadow-[0_18px_40px_rgba(15,48,61,0.08)] sm:px-6 sm:py-6">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Tjenester i hele Norge</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">Tjenester i hele Norge</h2>
            <div className="mt-3 max-w-3xl space-y-3 text-base leading-7 text-slate-600 sm:text-lg">
              <p>
                ServNest er en plattform hvor du kan legge ut oppdrag og finne personer som kan utføre tjenester. Her
                kan du enkelt få hjelp til oppgaver i hverdagen, eller selv ta oppdrag og tjene penger.
              </p>
              <p>
                På ServNest kan du koble deg med andre for å få utført eller utføre tjenester - raskt, enkelt og
                fleksibelt.
              </p>
            </div>
          </div>

          <div className="hidden rounded-[24px] border border-teal-200 bg-[linear-gradient(180deg,#f2fbfa_0%,#e5f6f4_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(11,143,123,0.10)] sm:px-6 sm:py-6">
            <p className="text-sm font-semibold text-slate-600">Populære områder</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["Oslo", "Bergen", "Trondheim", "Stavanger"].map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center rounded-full border border-teal-200 bg-white px-3 py-1 text-sm font-semibold text-teal-800"
                >
                  {city}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Legg ut oppdrag og nå personer som kan hjelpe, uansett om behovet er lokalt eller i en annen by.
            </p>
          </div>

          <div className="hidden rounded-[24px] border border-teal-200 bg-[linear-gradient(180deg,#f4fcfb_0%,#e3f4f1_100%)] px-5 py-5 shadow-[0_18px_40px_rgba(11,143,123,0.10)] sm:px-6 sm:py-6">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-teal-700">Dekning</p>
            <h3 className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">Flere byer. Bedre rekkevidde.</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              ServNest er bygget for oppdrag i hele Norge, med ekstra fokus pa byer der det er hoy aktivitet og rask
              respons.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {FEATURED_CITY_GROUPS.map((group) => (
                <div key={group.label} className="rounded-[20px] border border-white/80 bg-white/80 px-4 py-4">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">{group.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {group.cities.map((city) => (
                      <span
                        key={city}
                        className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50/70 px-3 py-1 text-sm font-semibold text-teal-900"
                      >
                        {city}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[18px] border border-white/80 bg-white/72 px-4 py-3 text-sm leading-6 text-slate-600">
              Legg ut oppdrag og na personer som kan hjelpe, enten behovet er lokalt eller i en annen del av landet.
            </div>
          </div>
        </section>

        <section className="mt-5 sm:mt-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Kategorier</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Utforsk tjenester etter behov</h2>
          </div>

          <div className="mt-3 grid gap-1.5 sm:mt-4 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-6">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`rounded-[14px] border px-2.5 py-2 text-left transition sm:rounded-[16px] sm:px-3 sm:py-2.5 ${
                selectedType === "ALL"
                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
                  : "border-white/80 bg-white/90 text-slate-700 shadow-[0_16px_32px_rgba(15,48,61,0.07)] hover:border-teal-300 hover:text-teal-700"
              }`}
            >
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] sm:h-12 sm:w-12 sm:rounded-[18px] ${selectedType === "ALL" ? "bg-white/12 text-white" : "bg-teal-100 text-teal-950 ring-1 ring-teal-200"}`}>
                <svg className="h-6 w-6 sm:h-7 sm:w-7" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <p className="mt-1 text-[0.86rem] font-black sm:mt-1.5 sm:text-[0.92rem]">Alle tjenester</p>
              <p className={`mt-0.5 text-[0.74rem] sm:text-[0.8rem] ${selectedType === "ALL" ? "text-white/78" : "text-slate-500"}`}>Se hele markedet</p>
            </button>
            {categories.map((category) =>
              category.type === "KEY_HANDLING" ? (
                <Link
                  key={category.type}
                  href="/airbnb"
                  className="rounded-[14px] border border-white/80 bg-white/90 px-2.5 py-2 text-left text-slate-700 shadow-[0_16px_32px_rgba(15,48,61,0.07)] transition hover:border-teal-300 hover:text-teal-700 sm:rounded-[16px] sm:px-3 sm:py-2.5"
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[16px] bg-teal-100 text-teal-950 ring-1 ring-teal-200 sm:h-12 sm:w-12 sm:rounded-[18px]">
                    <CategoryIcon type={category.type} />
                  </span>
                  <p className="mt-1 text-[0.86rem] font-black sm:mt-1.5 sm:text-[0.92rem]">{category.label}</p>
                  <p className="mt-1 text-sm text-slate-500">Åpne Airbnb-siden</p>
                </Link>
              ) : (
                <button
                  key={category.type}
                  type="button"
                  onClick={() => setSelectedType(category.type)}
                  className={`rounded-[14px] border px-2.5 py-2 text-left transition sm:rounded-[16px] sm:px-3 sm:py-2.5 ${
                    selectedType === category.type
                      ? "border-teal-700 bg-teal-700 text-white shadow-[0_18px_36px_rgba(11,143,123,0.18)]"
                      : "border-white/80 bg-white/90 text-slate-700 shadow-[0_16px_32px_rgba(15,48,61,0.07)] hover:border-teal-300 hover:text-teal-700"
                  }`}
                >
                  <span className={`inline-flex h-11 w-11 items-center justify-center rounded-[16px] sm:h-12 sm:w-12 sm:rounded-[18px] ${selectedType === category.type ? "bg-white/12 text-white" : "bg-teal-100 text-teal-950 ring-1 ring-teal-200"}`}>
                    <CategoryIcon type={category.type} />
                  </span>
                  <p className="mt-1 text-[0.86rem] font-black sm:mt-1.5 sm:text-[0.92rem]">{category.label}</p>
                  <p className={`mt-0.5 text-[0.74rem] sm:text-[0.8rem] ${selectedType === category.type ? "text-white/80" : "text-slate-500"}`}>
                    Filtrer oppdrag i denne kategorien
                  </p>
                </button>
              ),
            )}
          </div>

          <div className="mt-4 rounded-[20px] border border-white/80 bg-white/90 px-4 py-4 shadow-[0_16px_32px_rgba(15,48,61,0.07)] sm:px-5">
            <p className="text-sm text-slate-600">
              Vil du lese mer om hver tjeneste? Vi har laget egne sider for blant annet sma reparasjoner, rengjoring,
              flyttehjelp, hagearbeid og Airbnb-tjenester.
            </p>
            <Link href="/tjenester" className="mt-3 inline-flex text-sm font-black text-teal-700 underline underline-offset-4">
              Gå til tjenestesidene
            </Link>
          </div>
        </section>

        <section id="ledige-oppdrag" className="mt-6 scroll-mt-24 sm:mt-8">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Ledige oppdrag</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">Oppdrag folk trenger hjelp med nå</h2>
            </div>
            <details className="group relative lg:min-w-[180px]">
              <summary className="flex h-12 cursor-pointer list-none items-center justify-between rounded-[16px] border border-slate-300 bg-white px-4 py-2.5 text-left shadow-[0_12px_30px_rgba(15,48,61,0.08)] transition marker:content-none hover:border-teal-400 sm:h-14 sm:rounded-[18px] sm:py-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">Filter</p>
                </div>
                <svg
                  className="h-5 w-5 text-slate-700 transition group-open:rotate-180"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="m6 9 6 6 6-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </summary>

              <div className="absolute right-0 z-20 mt-3 grid w-full gap-3 rounded-[18px] border border-white/80 bg-white p-3 shadow-[0_18px_40px_rgba(15,48,61,0.14)] backdrop-blur sm:w-[320px] sm:rounded-[22px] sm:p-4">
                <label className="flex flex-col gap-2 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Område</span>
                  <select
                    value={selectedCounty}
                    onChange={(event) => setSelectedCounty(event.target.value)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500"
                  >
                    {NORWEGIAN_COUNTIES.map((county) => (
                      <option key={county} value={county}>
                        {county}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-2 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Sorter</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500"
                  >
                    <option value="SOONEST">Mest relevant</option>
                    <option value="NEWEST">Fra nyest til eldst</option>
                    <option value="OLDEST">Fra eldst til nyest</option>
                  </select>
                </label>
              </div>
            </details>
          </div>

          {filteredJobs.length > 0 ? (
            <section className="panel rounded-[28px] p-5">
              <div className="hidden lg:block">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[20%]" />
                    <col className="w-[30%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[22%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-[0.82rem] font-semibold text-slate-900">
                      <th className="pb-1.5 pr-4">Type</th>
                      <th className="pb-1.5 pr-4">Adresse</th>
                      <th className="pb-1.5 pr-4">Område</th>
                      <th className="pb-1.5 pr-4">Dato</th>
                      <th className="pb-1.5">Oppdrag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredJobs.map((job) => {
                      const translationKey = getServiceTypeTranslationKey(job.type);
                      const typeLabel = translationKey ? t(translationKey) : job.type;
                      const note = job.note?.trim() || "Se oppdragsdetaljene for full beskrivelse.";

                      return (
                        <tr key={job.id} className="align-top">
                          <td colSpan={5} className="p-0">
                            <div
                              className="grid cursor-pointer grid-cols-[20%_30%_14%_14%_22%] rounded-[14px] border border-teal-200 bg-[#f3fbfa] transition hover:bg-[#edf8f7]"
                              onClick={() => {
                                router.push(getJobHref(job.id));
                              }}
                            >
                              <div className="pl-3 pt-3 pb-1 pr-4 text-[0.82rem] text-slate-900">{typeLabel}</div>
                              <div className="px-0 py-1 pr-4 text-[0.82rem] text-slate-900">
                                <div className="break-words">{job.address}</div>
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex items-center rounded-[10px] border border-teal-400 bg-[#d5fbf4] px-2 py-[0.15rem] text-[0.72rem] font-semibold text-teal-900 shadow-sm"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Kart
                                </a>
                              </div>
                              <div className="px-0 py-1 pr-4 text-[0.82rem] text-slate-900">{inferCounty(job.address)}</div>
                              <div className="px-0 py-1 pr-4 text-[0.82rem] text-slate-900">
                                {formatPublicJobDate(job.date, locale)}
                              </div>
                              <div className="px-0 py-1 text-[0.82rem] text-slate-700">
                                <p className="whitespace-pre-wrap break-words">{note}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 lg:hidden">
                {filteredJobs.map((job) => {
                  const translationKey = getServiceTypeTranslationKey(job.type);
                  const typeLabel = translationKey ? t(translationKey) : job.type;
                  const note = job.note?.trim() || "Se oppdragsdetaljene for full beskrivelse.";

                  return (
                    <article
                      key={job.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(getJobHref(job.id))}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(getJobHref(job.id));
                        }
                      }}
                      className="block cursor-pointer rounded-[18px] border border-teal-200 bg-[#f3fbfa] p-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.95rem] text-slate-900">{typeLabel}</p>
                        </div>
                        <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">
                          {inferCounty(job.address)}
                        </span>
                      </div>
                      <p className="mt-2.5 whitespace-pre-wrap break-words text-[0.95rem] font-semibold text-slate-900">
                        {note}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center rounded-[10px] border border-teal-400 bg-[#d5fbf4] px-2.5 py-[0.15rem] text-[0.76rem] font-semibold text-teal-900 shadow-sm"
                      >
                        Kart
                      </a>
                      <div className="mt-2.5 flex items-end justify-between gap-3">
                        <p className="text-sm font-medium text-slate-500">{inferCity(job.address)}</p>
                        <p className="text-sm text-slate-600">
                          {formatPublicJobDate(job.date, locale)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="panel rounded-[24px] px-5 py-6 text-sm text-slate-500">{t("noJobsMatchSearch")}</div>
          )}
        </section>
      </div>

      <Link
        href="/om-oss"
        className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,23,42,0.28)] transition hover:bg-teal-700"
      >
        <span>Om oss</span>
      </Link>
    </main>
  );
}
