# ServNest - Play Store Release Runbook

Sist oppdatert: 23. februar 2026

## 1. Forberedelser
1. Bekreft at web er live: `https://nextjs-saas-v1.vercel.app`
2. Bekreft policy-lenker:
- `https://nextjs-saas-v1.vercel.app/privacy`
- `https://nextjs-saas-v1.vercel.app/terms`
- `https://nextjs-saas-v1.vercel.app/support`
3. Gå gjennom QA-listen i `docs/release-qa-checklist.md`.

## 2. Bygg release AAB
Kjør fra `mobile/`:

```powershell
npm run build:android:production
```

Dette lager en Android App Bundle (AAB) klar for Google Play.

## 3. Last opp til Google Play Console
1. Åpne Play Console -> appen `ServNest`.
2. Gå til `Testing` -> `Internal testing` (eller `Closed testing`).
3. Opprett ny release.
4. Last opp AAB-filen fra EAS-build.
5. Legg inn release notes.
6. Rull ut til testspor.

## 4. Fyll ut Store Listing
Bruk kladden i `docs/play-store-listing.md`.
Sørg for:
1. Appnavn
2. Kort + lang beskrivelse
3. Screenshots
4. Kontaktinfo

## 5. Fyll ut Data Safety
Bruk utkast i `docs/play-data-safety.md`.
Kontroller at svar matcher faktisk funksjon.

## 6. Content rating + App access
1. Fullfør innholdsgradering.
2. Hvis appen krever login, fyll ut testkonto ved behov.

## 7. Produksjonsrelease
1. Når test er godkjent, opprett `Production` release.
2. Last opp samme (eller ny) AAB.
3. Publiser.

## 8. Etter publisering
1. Verifiser appside i Play Store.
2. Test installasjon fra Play på ny enhet.
3. Følg opp krasj/feil og brukertilbakemeldinger.
