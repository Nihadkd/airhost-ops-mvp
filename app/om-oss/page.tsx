import Link from "next/link";

export default function AboutPage() {
  return (
    <main className="min-h-screen px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/75 px-5 py-4 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-7">
          <Link href="/" className="inline-flex items-center gap-3" aria-label="ServNest">
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
                ServNest er en plattform der folk kan hjelpe hverandre med små og store oppdrag. Her kan du enkelt legge ut en jobb du trenger hjelp til, eller finne oppdrag du kan utføre for andre.
              </p>
              <p>
                Opprett en oppgave, avtal pris og tidspunkt, og la andre i nærheten ta jobben. Tjenester kan være alt fra rengjøring, flyttehjelp og hagearbeid til teknisk hjelp, dyrepass og mye mer.
              </p>
              <p>
                ServNest gjør det enkelt å finne hjelp – eller tjene penger på å hjelpe andre.
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
                  +47 973 91 486
                </a>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">E-post</p>
                <a href="mailto:Servn3st@gmail.com" className="mt-2 inline-flex text-lg font-bold text-slate-900 break-all">
                  Servn3st@gmail.com
                </a>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
