import Link from "next/link";
import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Om ServNest | Lokal hjelp, smajobber og praktiske tjenester",
  description:
    "Les mer om ServNest, hvordan tjenesten fungerer og hvordan du kan finne eller tilby lokal hjelp til praktiske oppdrag.",
  path: "/om-oss",
  keywords: ["om ServNest", "lokale tjenester", "praktisk hjelp", "smajobber"],
});

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-7">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="ServNest">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b8f7b,#12303d)] text-white shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="currentColor" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-base font-black uppercase tracking-[0.28em] text-teal-700">ServNest</p>
              <p className="text-xs font-semibold text-slate-500">Om nettstedet</p>
            </div>
          </Link>
          <Link href="/" className="btn btn-secondary">
            Tilbake
          </Link>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
          <article className="panel rounded-[28px] px-6 py-7 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Om oss</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900">Velkommen til ServNest</h1>
            <div className="mt-6 space-y-4 text-base leading-8 text-slate-700 sm:text-lg">
              <p>
                ServNest er en plattform der folk kan hjelpe hverandre med sma og store oppdrag. Her kan du enkelt legge
                ut en jobb du trenger hjelp til, eller finne oppdrag du kan utfore for andre.
              </p>
              <p>
                Opprett en oppgave, avtal pris og tidspunkt, og la andre i naerheten ta jobben. Tjenester kan vaere alt
                fra rengjoring, flyttehjelp og hagearbeid til teknisk hjelp, dyrepass og mye mer.
              </p>
              <p>
                ServNest gjor det enkelt a finne hjelp eller tjene penger pa a hjelpe andre. Samtidig bygger vi tydelige
                brandsignaler pa nettstedet, slik at ServNest-navnet kobles sterkere til servnest.no i sok.
              </p>
            </div>
          </article>

          <aside className="panel rounded-[28px] px-6 py-7">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Kontakt</p>
            <h2 className="mt-3 text-2xl font-black text-slate-900">Kontaktinformasjon</h2>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Telefon</p>
                <a href="tel:+4797391486" className="mt-2 inline-flex text-lg font-bold text-slate-900">
                  {siteConfig.phone}
                </a>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">E-post</p>
                <a href={`mailto:${siteConfig.businessEmail}`} className="mt-2 inline-flex text-lg font-bold text-slate-900 break-all">
                  {siteConfig.businessEmail}
                </a>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Registrert enhet</p>
                <p className="mt-2 text-sm font-bold text-slate-900">{siteConfig.legalName}</p>
                <p className="mt-1 text-sm text-slate-700">Org.nr. {siteConfig.organizationNumber}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {siteConfig.address.streetAddress}, {siteConfig.address.postalCode} {siteConfig.address.addressLocality}
                </p>
              </div>
            </div>

            <Link href="/kontakt" className="mt-5 inline-flex text-sm font-black text-teal-700 underline underline-offset-4">
              Se full kontaktside
            </Link>
          </aside>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
