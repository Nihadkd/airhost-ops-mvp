"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";

type Me = {
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
};

type Order = {
  id: string;
  type: string;
  address: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  date: string;
  assignedToId: string | null;
};

type Stats = {
  activeOrders: number;
  completedOrders: number;
  landlords: number;
  workers: number;
};

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [me, setMe] = useState<Me | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const roleLabel: Record<string, string> = {
    ADMIN: t("roleAdmin"),
    UTLEIER: t("roleLandlord"),
    TJENESTE: t("roleWorker"),
  };

  const mapUrl = (address: string) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

  const fetchData = async () => {
    const meRes = await fetch("/api/users/me", { cache: "no-store" });
    if (meRes.ok) {
      setMe(await meRes.json());
    }

    const orderRes = await fetch("/api/orders", { cache: "no-store" });
    if (orderRes.ok) {
      setOrders(await orderRes.json());
    }

    const role = me?.effectiveRole;
    if (role === "ADMIN") {
      const statsRes = await fetch("/api/admin/stats", { cache: "no-store" });
      if (statsRes.ok) setStats(await statsRes.json());
    }
  };

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      const meRes = await fetch("/api/users/me", { cache: "no-store" });
      const meData = meRes.ok ? ((await meRes.json()) as Me) : null;
      if (mounted) setMe(meData);

      const orderRes = await fetch("/api/orders", { cache: "no-store" });
      if (mounted && orderRes.ok) {
        setOrders(await orderRes.json());
      }

      if (mounted && meData?.effectiveRole === "ADMIN") {
        const statsRes = await fetch("/api/admin/stats", { cache: "no-store" });
        if (statsRes.ok) setStats(await statsRes.json());
      }

      if (mounted) setLoading(false);
    };

    void run();

    return () => {
      mounted = false;
    };
  }, []);

  const claimJob = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/claim`, { method: "PUT" });
    if (!res.ok) {
      toast.error(t("cannotTakeJob"));
      return;
    }
    toast.success(t("takenJob"));
    await fetchData();
  };

  const role = me?.effectiveRole;

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{t("dashboard")} {role ? `(${roleLabel[role] ?? role})` : ""}</h1>
        <p className="text-sm text-slate-600">{t("overview")}</p>
      </div>

      {role === "ADMIN" && stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("activeJobs")}</p><p className="text-2xl font-bold">{stats.activeOrders}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("completedJobs")}</p><p className="text-2xl font-bold">{stats.completedOrders}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("landlords")}</p><p className="text-2xl font-bold">{stats.landlords}</p></div>
          <div className="panel p-4"><p className="text-sm text-slate-600">{t("workers")}</p><p className="text-2xl font-bold">{stats.workers}</p></div>
        </div>
      )}

      <div className="panel p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t("jobs")}</h2>
          {(role === "UTLEIER" || role === "ADMIN") && (
            <Link href="/orders/new" className="btn btn-primary">{t("newOrder")}</Link>
          )}
        </div>

        <div className="space-y-3 md:hidden">
          {loading && <p className="text-sm text-slate-500">{t("loadingJobs")}</p>}
          {!loading && orders.length === 0 && <p className="text-sm text-slate-500">{t("noJobs")}</p>}
          {!loading && orders.map((order) => (
            <div key={order.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold">{order.type}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{order.address}</p>
              <div className="mt-1 flex gap-3 text-xs">
                <a href={mapUrl(order.address)} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline">{t("openMap")}</a>
                <span className="text-slate-500">{new Date(order.date).toLocaleString(lang === "no" ? "nb-NO" : "en-US", { hour12: false })}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={`/orders/${order.id}`} className="btn btn-secondary">{t("open")}</Link>
                {role === "TJENESTE" && !order.assignedToId && (
                  <button className="btn btn-primary" onClick={() => claimJob(order.id)}>{t("takeJob")}</button>
                )}
                {role === "TJENESTE" && order.assignedToId && (
                  <span className="self-center text-xs text-slate-500">{t("assigned")}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2">{t("type")}</th>
                <th className="pb-2">{t("address")}</th>
                <th className="pb-2">{t("date")}</th>
                <th className="pb-2">{t("status")}</th>
                <th className="pb-2">{t("details")}</th>
                {role === "TJENESTE" && <th className="pb-2">{t("action")}</th>}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={role === "TJENESTE" ? 6 : 5}>{t("loadingJobs")}</td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td className="py-6 text-slate-500" colSpan={role === "TJENESTE" ? 6 : 5}>{t("noJobs")}</td>
                </tr>
              )}
              {!loading && orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-100">
                  <td className="py-2">{order.type}</td>
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span>{order.address}</span>
                      <a href={mapUrl(order.address)} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-700 underline">{t("openMap")}</a>
                    </div>
                  </td>
                  <td className="py-2">{new Date(order.date).toLocaleString(lang === "no" ? "nb-NO" : "en-US", { hour12: false })}</td>
                  <td className="py-2"><StatusBadge status={order.status} /></td>
                  <td className="py-2"><Link href={`/orders/${order.id}`} className="text-teal-700 underline">{t("open")}</Link></td>
                  {role === "TJENESTE" && (
                    <td className="py-2">
                      {order.assignedToId ? (
                        <span className="text-xs text-slate-500">{t("assigned")}</span>
                      ) : (
                        <button className="btn btn-primary" onClick={() => claimJob(order.id)}>{t("takeJob")}</button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}