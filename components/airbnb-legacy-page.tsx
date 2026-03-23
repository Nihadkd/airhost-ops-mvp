"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type SortMode = "NEWEST" | "OLDEST" | "SOONEST";

export function AirbnbLegacyPage({ jobs }: { jobs: AirbnbJob[] }) {
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("NEWEST");
  const { lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-GB";

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

            <button
              type="button"
              className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-slate-100 text-slate-700"
              aria-label="Meny"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true">
                <circle cx="8" cy="3" r="1.5" fill="currentColor" />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="8" cy="13" r="1.5" fill="currentColor" />
              </svg>
            </button>
          </div>
        </header>

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
