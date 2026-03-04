export const metadata = {
  title: "Personvern | ServNest",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto mt-10 w-[95%] max-w-3xl panel p-6">
      <h1 className="text-2xl font-bold">Personvernerklæring</h1>
      <p className="mt-2 text-sm text-slate-600">Sist oppdatert: 23. februar 2026</p>

      <section className="mt-5 space-y-3 text-sm leading-6">
        <p>
          ServNest behandler personopplysninger for å levere tjenester som oppdragshåndtering, chat, bilder og varslinger.
          Vi behandler kun data som er nødvendig for drift, sikkerhet og kundestøtte.
        </p>

        <h2 className="text-lg font-semibold">Hvilke data vi lagrer</h2>
        <p>Navn, e-post, telefon, brukerrolle, oppdrag, meldinger, opplastede bilder, varsler og enhets-token for push-varsler.</p>

        <h2 className="text-lg font-semibold">Hva data brukes til</h2>
        <p>Gjennomføre oppdrag, vise riktig informasjon til involverte parter, sende varsler, forbedre stabilitet og følge opp support.</p>

        <h2 className="text-lg font-semibold">Deling av data</h2>
        <p>
          Data deles ikke med tredjepart for markedsføring. Tekniske underleverandører (for eksempel hosting og push-leverandør)
          brukes kun for å levere tjenesten.
        </p>

        <h2 className="text-lg font-semibold">Dine rettigheter</h2>
        <p>Du kan be om innsyn, retting og sletting av konto/data. Kontakt oss på e-post under.</p>

        <h2 className="text-lg font-semibold">Kontakt</h2>
        <p>E-post: support@servnest.app</p>
      </section>
    </main>
  );
}

