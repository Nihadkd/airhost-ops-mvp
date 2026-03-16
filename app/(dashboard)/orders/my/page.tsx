"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PaymentBadge } from "@/components/payment-badge";
import { StatusBadge } from "@/components/status-badge";
import { toUserErrorMessage } from "@/lib/client-error";
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
  assignmentStatus?: "UNASSIGNED" | "PENDING_WORKER_ACCEPTANCE" | "PENDING_LANDLORD_APPROVAL" | "CONFIRMED";
  canStart?: boolean;
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const filtersFromUrl = useMemo<Filters>(() => ({
    search: searchParams.get("search") ?? "",
    sort:
      searchParams.get("sort") === "OLDEST_NEWEST" || searchParams.get("sort") === "NEAREST"
        ? (searchParams.get("sort") as Filters["sort"])
        : initialFilters.sort,
    status:
      searchParams.get("status") === "ongoing" || searchParams.get("status") === "completed"
        ? (searchParams.get("status") as Filters["status"])
        : initialFilters.status,
  }), [searchParams]);
  const pageFromUrl = useMemo(() => {
    const raw = Number(searchParams.get("page") ?? "1");
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  }, [searchParams]);
  const [filters, setFilters] = useState<Filters>(filtersFromUrl);
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>(filtersFromUrl);
  const [startingOrderId, setStartingOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [updatingSelectedStatus, setUpdatingSelectedStatus] = useState<Order["status"] | null>(null);
  const [page, setPage] = useState(pageFromUrl);
  const pageSize = 20;
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const mapUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const getTypeLabel = useCallback((type: string) => {
    const key = getServiceTypeTranslationKey(type);
    if (key) return t(key);
    return type;
  }, [t]);
  const shouldShowStartAction = useCallback(
    (order: Order) =>
      order.status === "PENDING" &&
      order.assignmentStatus === "CONFIRMED" &&
      !!order.assignedTo,
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedFilters(filters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    setFilters((prev) =>
      prev.search === filtersFromUrl.search &&
      prev.sort === filtersFromUrl.sort &&
      prev.status === filtersFromUrl.status
        ? prev
        : filtersFromUrl,
    );
    setDebouncedFilters((prev) =>
      prev.search === filtersFromUrl.search &&
      prev.sort === filtersFromUrl.sort &&
      prev.status === filtersFromUrl.status
        ? prev
        : filtersFromUrl,
    );
    setPage((prev) => (prev === pageFromUrl ? prev : pageFromUrl));
  }, [filtersFromUrl, pageFromUrl]);

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

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (debouncedFilters.search) nextParams.set("search", debouncedFilters.search);
    if (debouncedFilters.sort !== initialFilters.sort) nextParams.set("sort", debouncedFilters.sort);
    if (debouncedFilters.status !== initialFilters.status) nextParams.set("status", debouncedFilters.status);
    if (page > 1) nextParams.set("page", String(page));

    const next = nextParams.toString();
    const currentParams = new URLSearchParams(searchParams.toString());
    currentParams.delete("view");
    currentParams.delete("pageSize");
    const current = currentParams.toString();

    if (next === current) return;
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [debouncedFilters, page, pathname, router, searchParams]);

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/dashboard${queryString}`, { cache: "no-store" });
    if (!res.ok) return res.status;
    const data = (await res.json()) as DashboardPayload;
    setLoadError(false);
    setMe(data.me);
    setOrders(data.orders);
    if (data.filters?.status) {
      setFilters((prev) => ({ ...prev, status: data.filters?.status ?? prev.status }));
      setDebouncedFilters((prev) => ({ ...prev, status: data.filters?.status ?? prev.status }));
    }
    setTotalPages(data.pagination.totalPages);
    setTotal(data.pagination.total);
    return 200;
  }, [queryString]);

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
  const isAdmin = me?.effectiveRole === "ADMIN";
  const selectedOrders = useMemo(
    () => orders.filter((order) => selectedOrderIds.includes(order.id)),
    [orders, selectedOrderIds],
  );

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => orders.some((order) => order.id === id)));
  }, [orders]);

  const toggleOrderSelection = useCallback((orderId: string) => {
    setSelectedOrderIds((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]));
  }, []);

  const toggleSelectAllOrders = useCallback(() => {
    setSelectedOrderIds((prev) => (prev.length === orders.length ? [] : orders.map((order) => order.id)));
  }, [orders]);

  const updateSelectedOrdersStatus = useCallback(async (status: Order["status"]) => {
    if (!selectedOrders.length) return;

    setUpdatingSelectedStatus(status);
    const results = await Promise.allSettled(
      selectedOrders.map(async (order) => {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) {
          throw new Error(await toUserErrorMessage(res, t, "statusUpdated"));
        }
      }),
    );
    setUpdatingSelectedStatus(null);

    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      const firstError = rejected[0];
      toast.error(firstError.status === "rejected" ? firstError.reason?.message ?? t("bulkStatusPartialFailed") : t("bulkStatusPartialFailed"));
    }

    if (results.length > rejected.length) {
      const updatedOrderIds = new Set(selectedOrders.map((order) => order.id));
      setOrders((prev) => prev.map((order) => (updatedOrderIds.has(order.id) ? { ...order, status } : order)));
      toast.success(t("statusUpdated"));
      setSelectedOrderIds([]);
      void fetchData();
    }
  }, [fetchData, selectedOrders, t]);

  const deleteSelectedOrders = useCallback(async () => {
    if (!selectedOrders.length) return;
    const confirmed = window.confirm(t("confirmDeleteSelectedOrders"));
    if (!confirmed) return;

    setDeletingSelected(true);
    const results = await Promise.allSettled(
      selectedOrders.map(async (order) => {
        const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
        if (!res.ok) {
          throw new Error(await toUserErrorMessage(res, t, "deleteOrderAction"));
        }
      }),
    );
    setDeletingSelected(false);

    const rejected = results.filter((result) => result.status === "rejected");
    if (rejected.length > 0) {
      const firstError = rejected[0];
      toast.error(firstError.status === "rejected" ? firstError.reason?.message ?? t("bulkDeletePartialFailed") : t("bulkDeletePartialFailed"));
    }

    if (results.length > rejected.length) {
      const deletedOrderIds = new Set(selectedOrders.map((order) => order.id));
      setOrders((prev) => prev.filter((order) => !deletedOrderIds.has(order.id)));
      toast.success(t("orderDeleted"));
      setSelectedOrderIds([]);
      void fetchData();
    }
  }, [fetchData, selectedOrders, t]);

  const startOrder = useCallback(async (orderId: string) => {
    setStartingOrderId(orderId);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    if (!res.ok) {
      toast.error(await toUserErrorMessage(res, t, "genericError"));
      setStartingOrderId(null);
      return;
    }
    setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: "IN_PROGRESS", canStart: false } : order)));
    toast.success(t("statusUpdated"));
    setStartingOrderId(null);
    void fetchData();
  }, [fetchData, t]);
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
  const nextOrder = useMemo(() => {
    return [...orders]
      .filter((order) => order.status !== "COMPLETED")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
  }, [orders]);
  const orderDetailHref = useCallback((orderId: string) => {
    const params = new URLSearchParams();
    if (debouncedFilters.search) params.set("search", debouncedFilters.search);
    if (debouncedFilters.sort !== initialFilters.sort) params.set("sort", debouncedFilters.sort);
    if (debouncedFilters.status !== initialFilters.status) params.set("status", debouncedFilters.status);
    if (page > 1) params.set("page", String(page));
    const backTo = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    return `/orders/${orderId}?from=${encodeURIComponent(backTo)}`;
  }, [debouncedFilters, page, pathname]);

  return (
    <section className="space-y-4">
      <div className="panel overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,rgba(11,143,123,0.15),rgba(18,48,61,0.08))] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700/80">{t("myOrdersMenu")}</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight">{t("myOrdersMenu")}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {nextOrder
                  ? `${t("next")}: #${nextOrder.orderNumber} • ${nextOrder.address} • ${formatSchedule(nextOrder.date)}`
                  : t("myOrdersHint")}
              </p>
            </div>
          </div>
        </div>
        {loadError ? (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            {t("genericError")}
          </div>
        ) : null}
      </div>

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
        {isAdmin && orders.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center gap-2">
              <button className="btn btn-secondary" type="button" onClick={toggleSelectAllOrders}>
                {selectedOrderIds.length === orders.length ? t("clearSelection") : t("selectAllJobs")}
              </button>
              <span className="text-slate-600">
                {selectedOrderIds.length} {t("selectedOrdersCount")}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                className="btn btn-secondary"
                type="button"
                disabled={selectedOrderIds.length === 0 || deletingSelected || updatingSelectedStatus !== null}
                onClick={() => void updateSelectedOrdersStatus("PENDING")}
              >
                {updatingSelectedStatus === "PENDING" ? t("bulkStatusPendingBusy") : t("statusPending")}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={selectedOrderIds.length === 0 || deletingSelected || updatingSelectedStatus !== null}
                onClick={() => void updateSelectedOrdersStatus("IN_PROGRESS")}
              >
                {updatingSelectedStatus === "IN_PROGRESS" ? t("bulkStatusInProgressBusy") : t("statusInProgress")}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={selectedOrderIds.length === 0 || deletingSelected || updatingSelectedStatus !== null}
                onClick={() => void updateSelectedOrdersStatus("COMPLETED")}
              >
                {updatingSelectedStatus === "COMPLETED" ? t("bulkStatusCompletedBusy") : t("statusCompleted")}
              </button>
              <button
                className="btn btn-danger"
                type="button"
                disabled={selectedOrderIds.length === 0 || deletingSelected || updatingSelectedStatus !== null}
                onClick={() => void deleteSelectedOrders()}
              >
                {deletingSelected ? t("deleteSelectedOrdersBusy") : t("deleteSelectedOrders")}
              </button>
            </div>
          </div>
        ) : null}
        <div className="space-y-3 md:hidden">
          {loading && <p className="text-sm text-slate-500">{t("loadingJobs")}</p>}
          {!loading && orders.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              <p className="font-semibold text-slate-800">{t("noJobs")}</p>
              <p className="mt-1">{t("myOrdersHint")}</p>
            </div>
          )}
          {!loading && orders.map((order) => (
            <div
              key={order.id}
              className="cursor-pointer rounded-xl border border-teal-200 bg-teal-50/60 p-3 shadow-sm ring-1 ring-teal-100 transition duration-150 hover:bg-teal-50 active:scale-[0.99] active:bg-teal-100 active:ring-teal-300"
              role="button"
              tabIndex={0}
              aria-label={t("tapOpenJob")}
              onClick={() => router.push(orderDetailHref(order.id))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(orderDetailHref(order.id));
                }
              }}
            >
              {isAdmin ? (
                <div className="mb-3 flex items-center justify-between">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.id)}
                      onChange={() => toggleOrderSelection(order.id)}
                    />
                    <span>{t("selectLabel")}</span>
                  </label>
                </div>
              ) : null}
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
              {shouldShowStartAction(order) ? (
                <div className="mt-3">
                  <button
                    className={order.canStart === true ? "btn btn-danger w-full" : "btn btn-secondary w-full"}
                    disabled={startingOrderId === order.id || order.canStart !== true}
                    onClick={(e) => {
                      e.stopPropagation();
                      void startOrder(order.id);
                    }}
                  >
                    {startingOrderId === order.id ? t("saving") : t("startAction")}
                  </button>
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {isAdmin ? <th className="pb-2">{t("selectLabel")}</th> : null}
                <th className="pb-2">{t("orderIdNumber")}</th>
                <th className="pb-2">{t("type")}</th>
                <th className="pb-2">{t("address")}</th>
                <th className="pb-2">{t("landlords")}</th>
                <th className="pb-2">{t("responsible")}</th>
                <th className="pb-2">{t("postedDate")}</th>
                <th className="pb-2">{t("status")}</th>
                <th className="pb-2">{t("paymentSectionTitle")}</th>
                <th className="pb-2 text-right" aria-label={t("startAction")}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={isAdmin ? 10 : 9}>{t("loadingJobs")}</td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td className="py-8 text-slate-500" colSpan={isAdmin ? 10 : 9}>
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                      <p className="font-semibold text-slate-800">{t("noJobs")}</p>
                      <p className="mt-1 text-sm text-slate-500">{t("myOrdersHint")}</p>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && orders.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-teal-200 bg-teal-50/60 ring-1 ring-teal-100 transition duration-150 hover:bg-teal-50 active:scale-[0.999] active:bg-teal-100"
                  role="button"
                  tabIndex={0}
                  aria-label={t("tapOpenJob")}
                  onClick={() => router.push(orderDetailHref(order.id))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(orderDetailHref(order.id));
                    }
                  }}
                >
                  {isAdmin ? (
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        aria-label={t("selectLabel")}
                      />
                    </td>
                  ) : null}
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
                  <td className="py-2 text-right">
                    {shouldShowStartAction(order) ? (
                      <button
                        className={order.canStart === true ? "btn btn-danger" : "btn btn-secondary"}
                        disabled={startingOrderId === order.id || order.canStart !== true}
                        onClick={(e) => {
                          e.stopPropagation();
                          void startOrder(order.id);
                        }}
                      >
                        {startingOrderId === order.id ? t("saving") : t("startAction")}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
