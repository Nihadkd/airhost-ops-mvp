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
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-[1.35fr_0.65fr]">
          <article className="panel rounded-[28px] px-6 py-7 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Om oss</p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900">Om ServNest</h1>
            <div className="mt-6 space-y-4 text-base leading-8 text-slate-700 sm:text-lg">
              <p>
                {`ServNest er en digital plattform hvor privatpersoner og tjenesteytere m\u00f8tes for \u00e5 f\u00e5 utf\u00f8rt og utf\u00f8re oppdrag p\u00e5 en enkel og effektiv m\u00e5te. Plattformen gj\u00f8r det mulig \u00e5 legge ut oppdrag og komme i kontakt med personer som kan hjelpe, enten det gjelder sm\u00e5 oppgaver i hverdagen eller st\u00f8rre jobber.`}
              </p>
              <p>
                {`Gjennom ServNest kan du finne hjelp til et bredt spekter av tjenester, blant annet rengj\u00f8ring, flyttehjelp, transport, hagearbeid, teknisk hjelp og mindre reparasjoner. Samtidig gir plattformen mulighet for enkeltpersoner \u00e5 ta oppdrag og tjene penger ved \u00e5 hjelpe andre.`}
              </p>
              <p>
                {`ServNest er tilgjengelig i hele Norge, med s\u00e6rlig aktivitet i byer som Oslo, Bergen, Trondheim, Stavanger, Kristiansand og Troms\u00f8, samt i omr\u00e5der som Drammen, Fredrikstad, Sandnes, Lillestr\u00f8m, \u00c5lesund og Bod\u00f8. Plattformen er utviklet for \u00e5 fungere like godt lokalt som p\u00e5 tvers av byer og regioner.`}
              </p>
              <p>
                {`M\u00e5let med ServNest er \u00e5 gj\u00f8re det enklere \u00e5 koble behov med l\u00f8sninger - raskt, trygt og fleksibelt. Enten du trenger hjelp eller \u00f8nsker \u00e5 tilby tjenester, gir ServNest deg en effektiv m\u00e5te \u00e5 komme i gang p\u00e5.`}
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
