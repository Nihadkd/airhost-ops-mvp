# ServNest - Release QA Checklist

Sist oppdatert: 23. februar 2026

## A. Konto og tilgang
1. Registrer ny bruker (utleier) fungerer.
2. Registrer ny bruker (tjenesteutfører) fungerer.
3. Login/logout fungerer på web og app.
4. Feilmelding ved feil passord er tydelig.

## B. Oppdrag
1. Utleier kan opprette oppdrag.
2. Utleier kan redigere oppdrag etter publisering.
3. Utleier/admin kan slette oppdrag.
4. Tildeling til tjenesteutfører fungerer.
5. Fullføring flytter oppdrag til Fullførte oppdrag.
6. Fullførte oppdrag forsvinner fra aktivt dashboard.

## C. Filtrering og søk
1. Nyest til eldst fungerer.
2. Eldst til nyest fungerer.
3. Nærmest fungerer.
4. Fritekstsøk returnerer relevante oppdrag.

## D. Chat
1. Chat opprettes når oppdrag tas.
2. Begge parter kan sende meldinger.
3. Sletting av melding fungerer.
4. "Du har ny melding"-indikasjon vises.

## E. Roller og visning
1. Kontakt-lenker kun synlig for admin.
2. Brukernavn/rolle vises korrekt i profil og ikke feil steder.
3. Språkbytte NO/EN oversetter status og hovedtekster.

## F. Medier
1. Bildeopplasting fungerer.
2. Kommentarer på bilder fungerer.
3. Visning av bildehistorikk fungerer.

## G. Mobil spesifikt
1. Back-knapp går ett steg tilbake, ikke ut av appen med en gang.
2. Hjem-knapp/logo-navigasjon fungerer.
3. Push permission-flow vises ved første oppstart.
4. Push status viser `granted` etter tillatelse.

## H. Produksjonssanity
1. Ingen åpenbare konsollfeil i kritiske flows.
2. Ingen tydelige tegnkodingsfeil (æ/ø/å).
3. Lenker til personvern/vilkår/support fungerer.
