"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaymentBadge } from "@/components/payment-badge";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";
import { getServiceTypeTranslationKey } from "@/lib/service-types";

type Me = {
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
};

type Order = {
  id: string;
  orderNumber: number;
  type: string;
  address: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  date: string;
  createdAt: string;
  updatedAt: string;
  assignedToId: string | null;
  paymentStatus: "not_started" | "pending" | "paid";
  landlord: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
};

type Stats = {
  activeOrders: number;
  completedOrders: number;
  landlords: number;
  workers: number;
};

type HealthState = {
  appOk: boolean;
  dbOk: boolean;
  checkedAt: string | null;
  loading: boolean;
};

type DashboardPayload = {
  me: Me;
  orders: Order[];
  stats: Stats | null;
  filters?: {
    search: string;
    sort: "NEWEST_OLDEST" | "OLDEST_NEWEST" | "NEAREST";
    view: "active" | "completed";
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type Filters = {
  search: string;
  sort: "NEWEST_OLDEST" | "OLDEST_NEWEST" | "NEAREST";
};

const initialFilters: Filters = {
  search: "",
  sort: "NEWEST_OLDEST",
};

export function DashboardPageClient() {
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-US";
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [health, setHealth] = useState<HealthState>({
    appOk: false,
    dbOk: false,
    checkedAt: null,
    loading: true,
  });
  const fetchDataBusyRef = useRef(false);
  const fetchHealthBusyRef = useRef(false);

  const mapUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const getTypeLabel = useCallback((type: string) => {
    const key = getServiceTypeTranslationKey(type);
    if (key) return t(key);
    return type;
  }, [t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedFilters.search) params.set("search", debouncedFilters.search);
    params.set("sort", debouncedFilters.sort);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  }, [debouncedFilters, page]);

  const fetchData = useCallback(async () => {
    if (fetchDataBusyRef.current) return true;
    fetchDataBusyRef.current = true;
    try {
      const res = await fetch(`/api/dashboard${queryString}`, { cache: "no-store" });
      if (!res.ok) {
        return res.status;
      }

      const data = (await res.json()) as DashboardPayload;
      setLoadError(false);
      setMe(data.me);
      setOrders(data.orders);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
      setTotal(data.pagination.total);
      return 200;
    } catch {
      fetchDataBusyRef.current = false;
      return 500;
    } finally {
      fetchDataBusyRef.current = false;
    }
  }, [queryString]);

  const fetchHealth = useCallback(async () => {
    if (fetchHealthBusyRef.current) return;
    fetchHealthBusyRef.current = true;
    try {
      setHealth((prev) => ({ ...prev, loading: true }));

      const [appRes, dbRes] = await Promise.all([
        fetch("/api/health", { cache: "no-store" }),
        fetch("/api/health/db", { cache: "no-store" }),
      ]);

      let appOk = appRes.ok;
      let dbOk = dbRes.ok;

      if (appRes.ok) {
        const appData = (await appRes.json()) as { ok?: boolean };
        appOk = appData.ok === true;
      }

      if (dbRes.ok) {
        const dbData = (await dbRes.json()) as { ok?: boolean };
        dbOk = dbData.ok === true;
      }

      setHealth({
        appOk,
        dbOk,
        checkedAt: new Date().toISOString(),
        loading: false,
      });
    } finally {
      fetchHealthBusyRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const status = await fetchData();
      if (mounted && (status === 401 || status === 403)) {
        router.replace("/login");
        return;
      }
      if (mounted && status !== 200) {
        setLoadError(true);
      }

      if (mounted && me?.effectiveRole === "ADMIN") {
        await fetchHealth();
      }

      if (mounted) setLoading(false);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, [fetchData, fetchHealth, me?.effectiveRole, router, t]);

  useEffect(() => {
    const onModeChanged = () => {
      void fetchData();
    };
    window.addEventListener("mode-changed", onModeChanged);
    return () => window.removeEventListener("mode-changed", onModeChanged);
  }, [fetchData]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchData();
        if (me?.effectiveRole === "ADMIN") {
          void fetchHealth();
        }
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [fetchData, fetchHealth, me?.effectiveRole]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const formatCompletedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(locale, { hour12: false });
  };
  const formatSchedule = useCallback(
    (value: string) => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return "-";
      return date.toLocaleString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    },
    [locale],
  );

  const role = me?.effectiveRole;
  const isAdmin = role === "ADMIN";
  const visibleOrders = useMemo(
    () => orders.filter((order) => order.status === "PENDING" && order.assignedToId === null),
    [orders],
  );

  return (
    <section className="space-y-4">
      {loadError ? (
        <div className="panel border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
          {t("genericError")}
        </div>
      ) : null}

      {isAdmin && stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("activeJobs")}</p><p className="text-2xl font-bold">{stats.activeOrders}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("completedJobs")}</p><p className="text-2xl font-bold">{stats.completedOrders}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("landlords")}</p><p className="text-2xl font-bold">{stats.landlords}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("workers")}</p><p className="text-2xl font-bold">{stats.workers}</p></div>
        </div>
      )}

      {isAdmin && (
        <div className="panel p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("systemHealth")}</h2>
            <button className="btn btn-secondary" onClick={() => void fetchHealth()} disabled={health.loading}>
              {health.loading ? "..." : t("refresh")}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className={`rounded-lg border p-3 ${health.appOk ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <p className="text-xs text-slate-600">{t("appApi")}</p>
              <p className={`text-sm font-semibold ${health.appOk ? "text-emerald-700" : "text-rose-700"}`}>
                {health.appOk ? t("statusOk") : t("statusError")}
              </p>
            </div>
            <div className={`rounded-lg border p-3 ${health.dbOk ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              <p className="text-xs text-slate-600">{t("database")}</p>
              <p className={`text-sm font-semibold ${health.dbOk ? "text-emerald-700" : "text-rose-700"}`}>
                {health.dbOk ? t("statusOk") : t("statusError")}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("lastChecked")}:{" "}
            {health.checkedAt
              ? new Date(health.checkedAt).toLocaleString(locale, { hour12: false })
              : "-"}
          </p>
        </div>
      )}

      <div className="mb-3 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>{t("jobs")}: {total}</span>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            {t("prev")}
          </button>
          <span>{page}/{totalPages}</span>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            {t("next")}
          </button>
        </div>
      </div>

      <div className="panel p-4">
        <p className="mb-3 text-sm font-semibold">{t("filter")}</p>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <select
            className="input"
            value={filters.sort}
            onChange={(e) => updateFilter("sort", e.target.value as Filters["sort"])}
          >
            <option value="NEWEST_OLDEST">{t("sortNewestOldest")}</option>
            <option value="OLDEST_NEWEST">{t("sortOldestNewest")}</option>
            <option value="NEAREST">{t("sortNearest")}</option>
          </select>
          <input
            className="input md:col-span-1 lg:col-span-2"
            placeholder={t("searchJobs")}
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
          />
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("jobs")}</h2>
          {(role === "UTLEIER" || role === "ADMIN") && (
            <Link href="/orders/new" className="btn btn-primary">{t("newOrder")}</Link>
          )}
        </div>
        <div className="space-y-3 md:hidden">
          {loading && <p className="text-sm text-slate-500">{t("loadingJobs")}</p>}
          {!loading && visibleOrders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{t("noJobs")}</p>
              <p className="mt-1">{role === "TJENESTE" ? t("myOrdersHint") : t("overview")}</p>
            </div>
          )}
          {!loading && visibleOrders.map((order) => (
            <div
              key={order.id}
              className="cursor-pointer rounded-xl border border-teal-200 bg-teal-50/60 p-3 shadow-sm ring-1 ring-teal-100 transition duration-150 hover:bg-teal-50 active:scale-[0.99] active:bg-teal-100 active:ring-teal-300"
              role="button"
              tabIndex={0}
              aria-label={t("tapOpenJob")}
              onClick={() => router.push(`/orders/${order.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/orders/${order.id}`);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">#{order.orderNumber} {getTypeLabel(order.type)}</p>
                <div className="min-w-[110px] text-right">
                  <StatusBadge status={order.status} />
                </div>
              </div>
              <div className="mt-2">
                <PaymentBadge status={order.paymentStatus} />
              </div>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {formatSchedule(order.date)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t("landlords")}:{" "}
                <span className="font-semibold text-slate-900">{order.landlord.name}</span>
              </p>
              <p className="text-xs text-slate-500">
                {t("responsible")}:{" "}
                {order.assignedTo ? <span className="font-semibold text-slate-900">{order.assignedTo.name}</span> : "-"}
              </p>
              <p className="mt-2 text-sm text-slate-700">{order.address}</p>
              <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                <a
                  href={mapUrl(order.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg border border-teal-300 bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-900 shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("openMap")}
                </a>
                <span className="text-right text-[11px] font-semibold text-slate-600">
                  {order.status === "COMPLETED"
                    ? formatCompletedAt(order.updatedAt)
                    : new Date(order.date).toLocaleString(locale, { hour12: false })}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2">{t("orderIdNumber")}</th>
                <th className="pb-2">{t("type")}</th>
                <th className="pb-2">{t("address")}</th>
                <th className="pb-2">{t("landlords")}</th>
                <th className="pb-2">{t("responsible")}</th>
                <th className="pb-2">{t("postedDate")}</th>
                <th className="pb-2">{t("completedDate")}</th>
                <th className="pb-2">{t("status")}</th>
                <th className="pb-2">{t("paymentSectionTitle")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={9}>{t("loadingJobs")}</td>
                </tr>
              )}
              {!loading && visibleOrders.length === 0 && (
                <tr>
                  <td className="py-8 text-slate-500" colSpan={9}>
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <p className="font-semibold text-slate-800">{t("noJobs")}</p>
                      <p className="mt-1 text-sm text-slate-500">{role === "TJENESTE" ? t("myOrdersHint") : t("overview")}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-teal-200 bg-teal-50/60 ring-1 ring-teal-100 transition duration-150 hover:bg-teal-50 active:scale-[0.999] active:bg-teal-100"
                  role="button"
                  tabIndex={0}
                  aria-label={t("tapOpenJob")}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/orders/${order.id}`);
                    }
                  }}
                >
                  <td className="py-2 font-semibold">#{order.orderNumber}</td>
                  <td className="py-2">{getTypeLabel(order.type)}</td>
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span>{order.address}</span>
                      <a
                        href={mapUrl(order.address)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center rounded-lg border border-teal-300 bg-teal-100 px-3 py-1 text-sm font-semibold text-teal-900 shadow-sm"
                      >
                        {t("openMap")}
                      </a>
                    </div>
                  </td>
                  <td className="py-2">
                    <span className="font-semibold text-slate-900">{order.landlord.name}</span>
                  </td>
                  <td className="py-2">
                    {order.assignedTo ? <span className="font-semibold text-slate-900">{order.assignedTo.name}</span> : "-"}
                  </td>
                  <td className="py-2">{new Date(order.date).toLocaleString(locale, { hour12: false })}</td>
                  <td className="py-2">
                    {order.status === "COMPLETED"
                      ? new Date(order.updatedAt).toLocaleString(locale, { hour12: false })
                      : "-"}
                  </td>
                  <td className="py-2"><StatusBadge status={order.status} /></td>
                  <td className="py-2"><PaymentBadge status={order.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">
        <p className="text-lg font-bold text-slate-900">Kontakt oss</p>
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <a href="mailto:Servn3st@gmail.com" className="font-medium underline">
              Servn3st@gmail.com
            </a>
          </p>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-emerald-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2.25a9.75 9.75 0 0 0-8.3 14.87L2.4 21.6l4.63-1.23A9.75 9.75 0 1 0 12 2.25Zm0 17.5a7.7 7.7 0 0 1-3.92-1.07l-.28-.17-2.75.73.74-2.67-.18-.28A7.75 7.75 0 1 1 12 19.75Zm4.27-5.8c-.23-.11-1.37-.68-1.59-.76-.21-.08-.37-.11-.52.12-.15.23-.6.76-.73.92-.13.15-.26.17-.49.06-.23-.12-.96-.35-1.83-1.1-.68-.6-1.14-1.33-1.28-1.56-.13-.23-.01-.35.1-.46.1-.1.23-.26.34-.38.12-.13.15-.22.23-.38.08-.15.04-.29-.02-.4-.06-.12-.52-1.27-.72-1.73-.19-.46-.39-.39-.52-.4h-.45c-.15 0-.4.06-.61.29-.21.23-.8.78-.8 1.9 0 1.12.82 2.2.93 2.35.12.15 1.6 2.45 3.88 3.43.54.23.96.37 1.29.47.54.17 1.03.14 1.42.09.43-.07 1.37-.56 1.56-1.1.19-.54.19-1 .13-1.1-.05-.09-.2-.15-.43-.26Z" />
              </svg>
            </span>
            <a href="tel:+4797391486" className="font-medium underline">
              +47 973 91 486
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
