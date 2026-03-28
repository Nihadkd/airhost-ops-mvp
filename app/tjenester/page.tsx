import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildMetadata } from "@/lib/seo";
import { serviceLandingPages } from "@/lib/service-landing-pages";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Tjenester | ServNest",
  description:
    "Utforsk tjenestene pa ServNest, inkludert sma reparasjoner, rengjoring, flyttehjelp, hagearbeid, teknisk hjelp, dyrepass og Airbnb-tjenester.",
  path: "/tjenester",
  keywords: [
    "tjenester",
    "sma reparasjoner",
    "rengjoring",
    "flyttehjelp",
    "hagearbeid",
    "teknisk hjelp",
    "dyrepass",
    "airbnb tjenester",
  ],
});

const itemListStructuredData = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Tjenester pa ServNest",
  itemListElement: serviceLandingPages.map((page, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: new URL(page.path, siteConfig.url).toString(),
    name: page.heading,
  })),
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <JsonLd data={itemListStructuredData} />
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-6 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Tjenester</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">
            Tjenestesider laget for synlighet i Google
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Her finner du egne sider for tjenestene folk faktisk soker etter. Disse sidene gir ServNest sterkere signaler
            i sok, tydeligere internlenking og bedre mulighet til a rangere pa tjeneste + sted over tid.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-secondary">
              Til forsiden
            </Link>
            <Link href="/orders/new" className="btn btn-primary">
              Legg ut jobb
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {serviceLandingPages.map((page) => (
            <article key={page.slug} className="panel rounded-[24px] px-5 py-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Tjenesteside</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">{page.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">{page.summary}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {page.commonJobs.slice(0, 3).map((job) => (
                  <li key={job} className="rounded-2xl bg-slate-50 px-4 py-3">
                    {job}
                  </li>
                ))}
              </ul>
              <Link href={page.path} className="mt-5 inline-flex text-sm font-black text-teal-700 underline underline-offset-4">
                Les mer om {page.heading.toLowerCase()}
              </Link>
            </article>
          ))}
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
