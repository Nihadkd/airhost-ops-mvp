import type { Metadata } from "next";
import { PublicSiteFooter } from "@/components/public-site-footer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Support | ServNest",
  description: "Kontakt ServNest for teknisk hjelp, feilrapportering og sporsmal om konto eller tjenester.",
  path: "/support",
  keywords: ["support", "kundeservice", "kontakt ServNest"],
});

export default function SupportPage() {
  return (
    <main className="mx-auto mt-10 w-[95%] max-w-3xl">
      <section className="panel p-6">
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="mt-2 text-sm text-slate-600">For teknisk hjelp, kontoforesporsler eller feilrapportering.</p>

        <section className="mt-5 space-y-3 text-sm leading-6">
          <p>E-post: support@servnest.app</p>
          <p>Oppgi gjerne en kort beskrivelse, enhetstype og skjermbilde ved feil.</p>
        </section>
      </section>

      <PublicSiteFooter />
    </main>
  );
}
