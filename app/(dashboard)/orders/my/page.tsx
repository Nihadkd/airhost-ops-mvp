"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PaymentBadge } from "@/components/payment-badge";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";

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
  paymentStatus: "not_started" | "pending" | "paid";
  landlord: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
};

type DashboardPayload = {
  me: Me;
  orders: Order[];
  filters?: {
    status?: "ongoing" | "completed" | "all";
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
  status: "ongoing" | "completed" | "all";
};

const initialFilters: Filters = {
  search: "",
  sort: "NEWEST_OLDEST",
  status: "all",
};

export default function MyOrdersPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-US";
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(initialFilters);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const mapUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const getTypeLabel = useCallback((type: string) => {
    if (type === "CLEANING") return t("serviceCleaningName");
    if (type === "KEY_HANDLING") return t("serviceKeyHandlingName");
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
    params.set("view", "my");
    params.set("status", debouncedFilters.status);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `?${params.toString()}`;
  }, [debouncedFilters, page]);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/dashboard${queryString}`, { cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as DashboardPayload;
    setOrders(data.orders);
    if (data.filters?.status) {
      setFilters((prev) => ({ ...prev, status: data.filters?.status ?? prev.status }));
      setDebouncedFilters((prev) => ({ ...prev, status: data.filters?.status ?? prev.status }));
    }
    setTotalPages(data.pagination.totalPages);
    setTotal(data.pagination.total);
    return true;
  }, [queryString]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const ok = await fetchData();
      if (!ok && mounted) {
        toast.error(t("loginUnknownError"));
      }
      if (mounted) setLoading(false);
    };

    void run();
    return () => {
      mounted = false;
    };
  }, [fetchData, t]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const formatCompletedAt = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString(locale, { hour12: false });
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{t("myOrdersMenu")}</h1>
        <p className="text-sm text-slate-600">{t("myOrdersHint")}</p>
      </div>

      <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
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
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
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
          <select
            className="input"
            aria-label={t("myOrdersStatusFilter")}
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value as Filters["status"])}
          >
            <option value="ongoing">{t("myOrdersFilterOngoing")}</option>
            <option value="completed">{t("myOrdersFilterCompleted")}</option>
            <option value="all">{t("myOrdersFilterAll")}</option>
          </select>
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <h2 className="mb-3 text-lg font-semibold">{t("myOrdersMenu")}</h2>
        <div className="space-y-3 md:hidden">
          {loading && <p className="text-sm text-slate-500">{t("loadingJobs")}</p>}
          {!loading && orders.length === 0 && <p className="text-sm text-slate-500">{t("noJobs")}</p>}
          {!loading && orders.map((order) => (
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
              <p className="mt-1 text-xs text-slate-500">{t("landlords")}: {order.landlord.name}</p>
              <p className="text-xs text-slate-500">{t("responsible")}: {order.assignedTo?.name ?? "-"}</p>
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
                <th className="pb-2">{t("status")}</th>
                <th className="pb-2">{t("paymentSectionTitle")}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={8}>{t("loadingJobs")}</td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={8}>{t("noJobs")}</td>
                </tr>
              )}
              {!loading && orders.map((order) => (
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
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t("openMap")}
                      </a>
                    </div>
                  </td>
                  <td className="py-2">{order.landlord.name}</td>
                  <td className="py-2">{order.assignedTo?.name ?? "-"}</td>
                  <td className="py-2">{new Date(order.date).toLocaleString(locale, { hour12: false })}</td>
                  <td className="py-2"><StatusBadge status={order.status} /></td>
                  <td className="py-2"><PaymentBadge status={order.paymentStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
