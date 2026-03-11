export const metadata = {
  title: "Personvern | ServNest",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto mt-10 w-[95%] max-w-3xl panel p-6">
      <h1 className="text-2xl font-bold">Personvernerklaering for ServNest</h1>
      <p className="mt-2 text-sm text-slate-600">Sist oppdatert: 7. mars 2026</p>

      <section className="mt-5 space-y-3 text-sm leading-6">
        <p>
          ServNest behandler personopplysninger for a levere tjenesten, sikre drift, forebygge misbruk og oppfylle lovkrav.
        </p>

        <h2 className="text-lg font-semibold">1. Hvilke opplysninger vi behandler</h2>
        <p>Navn, e-post, telefon, rolle, oppdragsdata, meldinger, bilder, varslinger og tekniske loggdata.</p>

        <h2 className="text-lg font-semibold">2. Formal med behandlingen</h2>
        <p>Administrere oppdrag, muliggjore kommunikasjon, gjennomfore betaling/kvittering, og ivareta sikkerhet og support.</p>

        <h2 className="text-lg font-semibold">3. Rettslig grunnlag</h2>
        <p>Avtaleoppfyllelse, berettiget interesse og samtykke der dette kreves.</p>

        <h2 className="text-lg font-semibold">4. Deling av opplysninger</h2>
        <p>
          Opplysninger deles kun med relevante parter i oppdraget og tekniske underleverandorer for drift (hosting, e-post, varsling,
          betaling).
        </p>

        <h2 className="text-lg font-semibold">5. Lagringstid</h2>
        <p>Data lagres sa lenge det er nodvendig for tjenesten, sikkerhet, regnskap og lovpalagte plikter.</p>

        <h2 className="text-lg font-semibold">6. Dine rettigheter</h2>
        <p>Du kan be om innsyn, retting, sletting, begrensning, dataportabilitet og protest i tråd med gjeldende regelverk.</p>

        <h2 className="text-lg font-semibold">7. Sikkerhet</h2>
        <p>Vi bruker tilgangskontroll, kryptert trafikk, logging og andre rimelige tiltak for a beskytte opplysninger.</p>

        <h2 className="text-lg font-semibold">8. Kontakt</h2>
        <p>E-post: Servn3st@gmail.com</p>
        <p>Telefon: +47 973 91 486</p>
        <p>Org.nr: 937249721</p>
      </section>
    </main>
  );
}
