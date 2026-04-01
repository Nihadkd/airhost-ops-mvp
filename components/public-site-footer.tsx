import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function PublicSiteFooter() {
  const showBusinessEmail = siteConfig.businessEmail !== siteConfig.supportEmail;

  return (
    <footer className="mt-8 rounded-[28px] border border-white/80 bg-white/90 px-5 py-6 shadow-[0_16px_32px_rgba(15,48,61,0.07)] sm:px-7">
      <div className="grid gap-5 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700">ServNest</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">Lokal hjelp, fleksible oppdrag og enkel kontakt</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            ServNest kobler personer som trenger hjelp med personer som kan utføre tjenester. Kontaktinfo finner du her,
            mens full firmainfo ligger under `Om oss`.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
          <div className="rounded-[20px] bg-slate-50 px-4 py-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Kontakt</p>
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`} className="mt-2 block text-sm font-bold text-slate-900">
              {siteConfig.phone}
            </a>
            <a href={`mailto:${siteConfig.supportEmail}`} className="mt-1 block text-sm font-semibold text-slate-700 break-all">
              {siteConfig.supportEmail}
            </a>
            {showBusinessEmail ? (
              <a href={`mailto:${siteConfig.businessEmail}`} className="mt-1 block text-sm font-semibold text-slate-700 break-all">
                {siteConfig.businessEmail}
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-200 pt-4 text-sm font-semibold text-slate-600">
        <Link href="/om-oss" className="hover:text-teal-700">
          Om oss
        </Link>
        <Link href="/kontakt" className="hover:text-teal-700">
          Kontakt
        </Link>
        <Link href="/tjenester" className="hover:text-teal-700">
          Tjenester
        </Link>
        <Link href="/support" className="hover:text-teal-700">
          Support
        </Link>
        <Link href="/privacy" className="hover:text-teal-700">
          Personvern
        </Link>
        <Link href="/terms" className="hover:text-teal-700">
          Vilkar
        </Link>
      </div>
    </footer>
  );
}
