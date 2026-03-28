import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildLocalBusinessStructuredData, buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Kontakt ServNest | Adresse, telefon og e-post",
  description:
    "Kontakt ServNest for sporsmal om tjenester, support og samarbeid. Her finner du adresse, telefon, e-post og registrert firmainfo.",
  path: "/kontakt",
  keywords: ["kontakt ServNest", "adresse", "telefon", "epost", "orgnr"],
});

const contactPageStructuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Kontakt ServNest",
  url: `${siteConfig.url}/kontakt`,
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <JsonLd data={[buildLocalBusinessStructuredData(), contactPageStructuredData]} />
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-6 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Kontakt</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">Kontakt ServNest</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Denne siden samler kontaktinformasjon, registrert firmainfo og offentlige brandsignaler pa ett sted. Det
            gjor det lettere for bade brukere og Google a koble ServNest-navnet til riktig nettsted.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="btn btn-secondary">
              Til forsiden
            </Link>
            <Link href="/om-oss" className="btn btn-primary">
              Les om ServNest
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="panel rounded-[28px] px-6 py-7 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Bedriftsinfo</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Merkenavn</p>
                <p className="mt-2 text-lg font-black text-slate-900">{siteConfig.name}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Registrert navn</p>
                <p className="mt-2 text-lg font-black text-slate-900">{siteConfig.legalName}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Organisasjonsnummer</p>
                <p className="mt-2 text-lg font-black text-slate-900">{siteConfig.organizationNumber}</p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Forretningsadresse</p>
                <p className="mt-2 text-lg font-black text-slate-900">{siteConfig.address.streetAddress}</p>
                <p className="text-base text-slate-700">
                  {siteConfig.address.postalCode} {siteConfig.address.addressLocality}, Norge
                </p>
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <section className="panel rounded-[28px] px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Kontaktpunkter</p>
              <div className="mt-4 space-y-4">
                <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Telefon</p>
                  <a href="tel:+4797391486" className="mt-2 inline-flex text-lg font-black text-slate-900">
                    {siteConfig.phone}
                  </a>
                </div>
                <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Support</p>
                  <a href={`mailto:${siteConfig.supportEmail}`} className="mt-2 inline-flex text-lg font-black text-slate-900 break-all">
                    {siteConfig.supportEmail}
                  </a>
                </div>
                <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Bedriftse-post</p>
                  <a href={`mailto:${siteConfig.businessEmail}`} className="mt-2 inline-flex text-lg font-black text-slate-900 break-all">
                    {siteConfig.businessEmail}
                  </a>
                </div>
              </div>
            </section>

            <section className="panel rounded-[28px] px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">For merkevaresok</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                En tydelig kontaktside med samme navn, adresse, telefon og org.nr. som i offentlige registre styrker
                samsvarssignalet mellom ServNest-navnet og domenet servnest.no.
              </p>
            </section>
          </aside>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
