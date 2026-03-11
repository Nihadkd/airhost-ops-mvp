export const metadata = {
  title: "Vilkår | ServNest",
};

export default function TermsPage() {
  return (
    <main className="mx-auto mt-10 w-[95%] max-w-3xl panel p-6">
      <h1 className="text-2xl font-bold">Brukervilkår for ServNest</h1>
      <p className="mt-2 text-sm text-slate-600">Sist oppdatert: 7. mars 2026</p>

      <section className="mt-5 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">1. Om tjenesten</h2>
        <p>ServNest er en digital plattform som formidler oppdrag mellom utleiere, tjenesteutforere og administrator.</p>

        <h2 className="text-lg font-semibold">2. Aksept av vilkar</h2>
        <p>Ved a opprette konto eller bruke ServNest, aksepterer du disse vilkarene.</p>

        <h2 className="text-lg font-semibold">3. Brukerkonto og ansvar</h2>
        <p>Du er ansvarlig for riktige opplysninger, sikker oppbevaring av innlogging og aktivitet pa egen konto.</p>

        <h2 className="text-lg font-semibold">4. Oppdrag og avtaler</h2>
        <p>Nar et oppdrag opprettes, aksepteres eller fullfores i appen, anses det som en bindende digital avtale mellom partene.</p>

        <h2 className="text-lg font-semibold">5. Betaling via appen (obligatorisk)</h2>
        <p>Alle avtaler, bestillinger og betalinger knyttet til oppdrag opprettet i ServNest skal gjennomfores via ServNest.</p>
        <p>Det er ikke tillatt a omga plattformens betalingslosning ved privat oppgjor eller ekstern betaling.</p>

        <h2 className="text-lg font-semibold">6. Brudd pa betalingsreglene</h2>
        <p>Ved brudd eller forsok pa omgaelse kan ServNest, etter konkret vurdering:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>gi advarsel, suspendere eller stenge konto</li>
          <li>ilegge gebyr eller erstatningskrav for dokumentert tap</li>
          <li>ved grove eller gjentatte forhold, anmelde forholdet</li>
        </ul>

        <h2 className="text-lg font-semibold">7. Misbruk og ulovlig aktivitet</h2>
        <p>Misbruk, svindel, falske profiler, trakassering eller ulovlig innhold er forbudt og kan medfore permanent utestengelse.</p>

        <h2 className="text-lg font-semibold">8. Endringer i vilkar</h2>
        <p>Vilkårene kan oppdateres. Vesentlige endringer varsles i tjenesten.</p>

        <h2 className="text-lg font-semibold">9. Lovvalg og tvister</h2>
        <p>Vilkårene reguleres av norsk rett. Tvister sokes lost i minnelighet for eventuell domstolsbehandling.</p>

        <h2 className="text-lg font-semibold">10. Kontakt</h2>
        <p>E-post: Servn3st@gmail.com</p>
        <p>Telefon: +47 973 91 486</p>
        <p>Org.nr: 937249721</p>
      </section>
    </main>
  );
}
