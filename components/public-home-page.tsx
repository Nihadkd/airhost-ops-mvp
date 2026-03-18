"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { inferCity, inferCounty, NORWEGIAN_COUNTIES } from "@/lib/public-job-presentation";
import { getServiceTypeTranslationKey, ORDERABLE_SERVICE_TYPES } from "@/lib/service-types";

type PublicJob = {
  id: string;
  orderNumber: number;
  type: string;
  address: string;
  date: string;
  note: string | null;
};

type SortMode = "SOONEST" | "NEWEST" | "OLDEST";

function CategoryIcon({ type }: { type: string }) {
  const iconClassName = "h-5 w-5";

  switch (type) {
    case "CLEANING":
      return (
        <svg className={iconClassName} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 4h8l1 5H8l-1-5Zm2 7h6l1 8H8l1-8Zm1.5 2.5v3m3-3v3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
          <path d="M14 5a4 4 0 0 0 5 5l-8.5 8.5a2.1 2.1 0 1 1-3-3L16 7a4 4 0 0 0-2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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
          <path d="M8 5h8m-7 4h6m-8 4h10m-9 4h8M5 5h.01M5 9h.01M5 13h.01M5 17h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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

export function PublicHomePage({ jobs }: { jobs: PublicJob[] }) {
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedCounty, setSelectedCounty] = useState<string>("Alle fylker");
  const [sortMode, setSortMode] = useState<SortMode>("SOONEST");
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-GB";

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
    const normalizedQuery = query.trim().toLowerCase();

    return jobs
      .filter((job) => {
        if (selectedType !== "ALL" && job.type !== selectedType) {
          return false;
        }

        if (selectedCounty !== "Alle fylker" && inferCounty(job.address) !== selectedCounty) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const translationKey = getServiceTypeTranslationKey(job.type);
        const typeLabel = translationKey ? t(translationKey).toLowerCase() : job.type.toLowerCase();

        return (
          job.address.toLowerCase().includes(normalizedQuery) ||
          typeLabel.includes(normalizedQuery) ||
          (job.note ?? "").toLowerCase().includes(normalizedQuery) ||
          inferCounty(job.address).toLowerCase().includes(normalizedQuery) ||
          inferCity(job.address).toLowerCase().includes(normalizedQuery)
        );
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-7">
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

          <div className="flex flex-wrap gap-2">
            <Link href="/login" className="btn btn-secondary">
              Logg inn
            </Link>
            <Link href="/orders/new" className="btn btn-primary">
              Legg ut jobb
            </Link>
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[36px] border border-[#d7e7ea] bg-[radial-gradient(circle_at_top,#f8fffd_0%,#ecf6f7_40%,#f8fbfc_100%)] px-6 py-8 shadow-[0_28px_90px_rgba(15,48,61,0.12)] sm:px-10 sm:py-12">
          <div className="absolute -right-16 top-8 h-40 w-40 rounded-full bg-teal-200/35 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-sky-200/30 blur-3xl" aria-hidden="true" />

          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-teal-700">Lokale oppdrag. Rask hjelp. Trygg flyt.</p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[0.98] text-slate-900 sm:text-[4.1rem]">
                Finn hjelp i nærheten, eller tjen penger på oppdrag som passer deg
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                ServNest gjør det enkelt å oppdage ledige jobber, legge ut egne behov og holde hele avtalen samlet på ett sted.
              </p>

              <label htmlFor="public-search" className="sr-only">
                Søk etter oppdrag
              </label>
              <div className="mt-7 max-w-4xl">
                <div className="panel flex items-center gap-3 rounded-[28px] border border-white/80 bg-white/96 px-4 py-3 shadow-[0_24px_60px_rgba(11,143,123,0.10)] sm:px-6 sm:py-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
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
                    className="w-full border-0 bg-transparent text-lg font-semibold text-slate-900 outline-none placeholder:text-slate-400 sm:text-[1.35rem]"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link href="#ledige-oppdrag" className="btn btn-secondary px-6">
                  Finn oppdrag
                </Link>
                <Link href="/orders/new" className="btn btn-primary px-6">
                  Legg ut jobb
                </Link>
              </div>
              <p className="mt-3 text-sm font-medium text-slate-500">
                Innlogging kreves når du skal legge ut eller påta deg en jobb.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[30px] border border-white/80 bg-[linear-gradient(180deg,rgba(15,48,61,0.97),rgba(11,143,123,0.94))] p-6 text-white shadow-[0_26px_60px_rgba(15,48,61,0.18)]">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">Slik fungerer det</p>
                <div className="mt-5 space-y-4">
                  {[
                    { step: "01", title: "Søk eller filtrer", text: "Finn oppdrag etter kategori, område eller tidspunkt." },
                    { step: "02", title: "Velg riktig oppdrag", text: "Se detaljer før du bestemmer deg for å gå videre." },
                    { step: "03", title: "Logg inn når du handler", text: "Innlogging kreves først når du vil ta eller legge ut jobb." },
                  ].map((item) => (
                    <div key={item.step} className="flex gap-4 rounded-[22px] border border-white/10 bg-white/8 px-4 py-4 backdrop-blur">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-sm font-black">
                        {item.step}
                      </div>
                      <div>
                        <p className="text-sm font-black text-white">{item.title}</p>
                        <p className="mt-1 text-sm leading-6 text-white/72">{item.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Kategorier</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">Utforsk tjenester etter behov</h2>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <button
              type="button"
              onClick={() => setSelectedType("ALL")}
              className={`rounded-[24px] border px-4 py-5 text-left transition ${
                selectedType === "ALL"
                  ? "border-slate-900 bg-slate-900 text-white shadow-[0_18px_36px_rgba(15,23,42,0.18)]"
                  : "border-white/80 bg-white/90 text-slate-700 shadow-[0_16px_32px_rgba(15,48,61,0.07)] hover:border-teal-300 hover:text-teal-700"
              }`}
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${selectedType === "ALL" ? "bg-white/12" : "bg-slate-100"}`}>
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 12h16M12 4v16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </span>
              <p className="mt-3 text-base font-black">Alle tjenester</p>
              <p className={`mt-1 text-sm ${selectedType === "ALL" ? "text-white/78" : "text-slate-500"}`}>Se hele markedet</p>
            </button>
            {categories.map((category) => (
              <button
                key={category.type}
                type="button"
                onClick={() => setSelectedType(category.type)}
                className={`rounded-[24px] border px-4 py-5 text-left transition ${
                  selectedType === category.type
                    ? "border-teal-700 bg-teal-700 text-white shadow-[0_18px_36px_rgba(11,143,123,0.18)]"
                    : "border-white/80 bg-white/90 text-slate-700 shadow-[0_16px_32px_rgba(15,48,61,0.07)] hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${selectedType === category.type ? "bg-white/12" : "bg-slate-100"}`}>
                  <CategoryIcon type={category.type} />
                </span>
                <p className="mt-3 text-base font-black">{category.label}</p>
                <p className={`mt-1 text-sm ${selectedType === category.type ? "text-white/80" : "text-slate-500"}`}>
                  Filtrer oppdrag i denne kategorien
                </p>
              </button>
            ))}
          </div>
        </section>

        <section id="ledige-oppdrag" className="mt-8 scroll-mt-24">
          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Ledige oppdrag</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900">Oppdrag folk trenger hjelp med nå</h2>
            </div>
            <details className="group relative lg:min-w-[180px]">
              <summary className="flex h-14 cursor-pointer list-none items-center justify-between rounded-[18px] border border-slate-300 bg-white px-4 py-3 text-left shadow-[0_12px_30px_rgba(15,48,61,0.08)] transition marker:content-none hover:border-teal-400">
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

              <div className="absolute right-0 z-20 mt-3 grid w-full gap-3 rounded-[22px] border border-white/80 bg-white p-4 shadow-[0_18px_40px_rgba(15,48,61,0.14)] backdrop-blur sm:w-[320px]">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredJobs.map((job) => {
                const translationKey = getServiceTypeTranslationKey(job.type);
                const typeLabel = translationKey ? t(translationKey) : job.type;
                const note = job.note?.trim() || "Se oppdragsdetaljene for full beskrivelse.";

                return (
                  <Link
                    key={job.id}
                    href={`/oppdrag/${job.id}`}
                    className="panel block rounded-[26px] border border-white/80 bg-white/96 px-4 py-4 transition hover:-translate-y-1 hover:shadow-[0_22px_56px_rgba(15,48,61,0.12)]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-teal-800">
                        {typeLabel}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">#{job.orderNumber}</span>
                    </div>
                    <h3 className="mt-4 line-clamp-2 text-[1.05rem] font-black leading-6 text-slate-900">{note}</h3>
                    <div className="mt-4 grid gap-2 rounded-[20px] bg-slate-50 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-700">{inferCity(job.address)}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{inferCounty(job.address)}</span>
                      </div>
                      <p className="line-clamp-1 text-sm font-semibold text-slate-700">{job.address}</p>
                      <p className="text-sm font-medium text-slate-500">
                        {new Date(job.date).toLocaleString(locale, { hour12: false })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="panel rounded-[24px] px-5 py-6 text-sm text-slate-500">
              Ingen ledige oppdrag matcher filtrene dine akkurat nå.
            </div>
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
