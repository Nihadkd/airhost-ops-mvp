export const metadata = {
  title: "Vilkår | ServNest",
};

export default function TermsPage() {
  return (
    <main className="mx-auto mt-10 w-[95%] max-w-3xl panel p-6">
      <h1 className="text-2xl font-bold">Brukervilkår</h1>
      <p className="mt-2 text-sm text-slate-600">Sist oppdatert: 23. februar 2026</p>

      <section className="mt-5 space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Formål</h2>
        <p>ServNest kobler utleiere, tjenesteutførere og admin for å administrere oppdrag og kommunikasjon.</p>

        <h2 className="text-lg font-semibold">Brukeransvar</h2>
        <p>Du er ansvarlig for riktig informasjon i profilen din og for all aktivitet på egen konto.</p>

        <h2 className="text-lg font-semibold">Oppdrag og kommunikasjon</h2>
        <p>Oppdrag kan inneholde chat, bilder, status og kommentarer. Upassende eller ulovlig bruk er ikke tillatt.</p>

        <h2 className="text-lg font-semibold">Tilgjengelighet</h2>
        <p>Vi jobber for høy tilgjengelighet, men kan ikke garantere kontinuerlig drift uten avbrudd.</p>

        <h2 className="text-lg font-semibold">Endringer i vilkår</h2>
        <p>Vilkår kan oppdateres. Vesentlige endringer kommuniseres i tjenesten.</p>

        <h2 className="text-lg font-semibold">Kontakt</h2>
        <p>E-post: support@servnest.app</p>
      </section>
    </main>
  );
}

