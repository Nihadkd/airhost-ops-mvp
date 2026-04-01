import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildLocalBusinessStructuredData, buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = buildMetadata({
  title: "Kontakt ServNest | Telefon og e-post",
  description:
    "Kontakt ServNest for sporsmal om tjenester, support og samarbeid. Her finner du telefon og e-post.",
  path: "/kontakt",
  keywords: ["kontakt ServNest", "telefon", "epost", "support"],
});

const contactPageStructuredData = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Kontakt ServNest",
  url: `${siteConfig.url}/kontakt`,
};

export default function ContactPage() {
  const showBusinessEmail = siteConfig.businessEmail !== siteConfig.supportEmail;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <JsonLd data={[buildLocalBusinessStructuredData(), contactPageStructuredData]} />
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-6 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Kontakt</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">Kontakt ServNest</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            Her finner du de raskeste måtene a komme i kontakt med ServNest på dersom du trenger hjelp, har sporsmal
            eller vil folge opp en sak.
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

        <section className="mt-6 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <article className="panel rounded-[28px] px-6 py-7 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Kontakt</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-700 sm:text-base">
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Om kontaktsiden</p>
                <p className="mt-2 text-base text-slate-700">
                  Bruk denne siden dersom du vil kontakte ServNest om tjenester, tekniske problemer eller generelle
                  henvendelser.
                </p>
              </div>
              <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Mer om ServNest</p>
                <p className="mt-2 text-base text-slate-700">
                  Full firmainfo og bakgrunn om ServNest finner du under `Om oss`.
                </p>
                <Link href="/om-oss" className="mt-3 inline-flex text-sm font-black text-teal-700 underline underline-offset-4">
                  Gå til Om oss
                </Link>
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
                {showBusinessEmail ? (
                  <div className="rounded-[20px] bg-slate-50 px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Bedriftse-post</p>
                    <a href={`mailto:${siteConfig.businessEmail}`} className="mt-2 inline-flex text-lg font-black text-slate-900 break-all">
                      {siteConfig.businessEmail}
                    </a>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="panel rounded-[28px] px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">For merkevaresok</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Denne siden er holdt enkel og fokusert pa kontakt. Full firmainfo vises under `Om oss`.
              </p>
            </section>
          </aside>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
