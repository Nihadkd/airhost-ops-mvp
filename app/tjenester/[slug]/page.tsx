import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildFaqStructuredData, buildMetadata, buildOrganizationStructuredData } from "@/lib/seo";
import { getServiceLandingPageBySlug, serviceLandingPages } from "@/lib/service-landing-pages";
import { siteConfig } from "@/lib/site-config";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return serviceLandingPages.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getServiceLandingPageBySlug(slug);

  if (!page) {
    return buildMetadata({
      title: "Tjeneste ikke funnet | ServNest",
      description: "Tjenesten du lette etter finnes ikke pa ServNest.",
      path: "/tjenester",
    });
  }

  return buildMetadata({
    title: page.title,
    description: page.description,
    path: page.path,
    keywords: page.keywords,
  });
}

export default async function ServiceLandingPage({ params }: ServicePageProps) {
  const { slug } = await params;
  const page = getServiceLandingPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const relatedPages = serviceLandingPages.filter((entry) => entry.slug !== page.slug).slice(0, 3);
  const serviceStructuredData = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.heading,
    serviceType: page.heading,
    description: page.description,
    provider: {
      "@type": "Organization",
      name: siteConfig.name,
      url: siteConfig.url,
      telephone: siteConfig.phone,
      email: siteConfig.supportEmail,
    },
    areaServed: {
      "@type": "Country",
      name: "Norge",
    },
    url: new URL(page.path, siteConfig.url).toString(),
  };

  const breadcrumbStructuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Forside",
        item: siteConfig.url,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tjenester",
        item: new URL("/tjenester", siteConfig.url).toString(),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.heading,
        item: new URL(page.path, siteConfig.url).toString(),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <JsonLd data={[buildOrganizationStructuredData(), serviceStructuredData, breadcrumbStructuredData, buildFaqStructuredData(page.faq)]} />
      <div className="mx-auto max-w-5xl">
        <header className="rounded-[28px] border border-white/70 bg-white/80 px-5 py-6 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-8 sm:py-8">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">Tjenesteside</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-slate-900 sm:text-5xl">{page.heading}</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">{page.summary}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#ledige-oppdrag" className="btn btn-secondary">
              Se ledige oppdrag
            </Link>
            <Link href="/orders/new" className="btn btn-primary">
              Legg ut jobb
            </Link>
          </div>
        </header>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="panel rounded-[28px] px-6 py-7 sm:px-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Om tjenesten</p>
            <p className="mt-4 text-base leading-8 text-slate-700 sm:text-lg">{page.intro}</p>

            <h2 className="mt-8 text-2xl font-black text-slate-900">Hvorfor denne siden er viktig</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-700 sm:text-base">
              {page.highlights.map((item) => (
                <li key={item} className="rounded-[20px] bg-slate-50 px-4 py-4">
                  {item}
                </li>
              ))}
            </ul>

            <h2 className="mt-8 text-2xl font-black text-slate-900">Typiske oppdrag</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {page.commonJobs.map((job) => (
                <li key={job} className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-800">
                  {job}
                </li>
              ))}
            </ul>
          </article>

          <aside className="space-y-4">
            <section className="panel rounded-[28px] px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">SEO-fokus</p>
              <h2 className="mt-3 text-2xl font-black text-slate-900">Hva denne siden hjelper med</h2>
              <p className="mt-4 text-sm leading-7 text-slate-600">
                Egen URL, tydelig tittel, beskrivende innhold, interne lenker og strukturert data gjor det lettere for
                Google a forsta hva siden handler om og nar den bor vises.
              </p>
            </section>

            <section className="panel rounded-[28px] px-6 py-7">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">FAQ</p>
              <div className="mt-4 space-y-3">
                {page.faq.map((item) => (
                  <div key={item.question} className="rounded-[18px] bg-slate-50 px-4 py-4">
                    <h3 className="text-base font-black text-slate-900">{item.question}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>

        <section className="mt-6 panel rounded-[28px] px-6 py-7 sm:px-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">Relaterte tjenester</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {relatedPages.map((entry) => (
              <Link
                key={entry.slug}
                href={entry.path}
                className="rounded-[20px] border border-slate-200 bg-white px-4 py-4 transition hover:border-teal-300 hover:text-teal-700"
              >
                <p className="text-lg font-black text-slate-900">{entry.heading}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{entry.summary}</p>
              </Link>
            ))}
          </div>
        </section>

        <PublicSiteFooter />
      </div>
    </main>
  );
}
