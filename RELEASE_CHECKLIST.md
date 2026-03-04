# ServNest Release Checklist (Build-Sparsom)

## Mål
- Maks `1` Android build per dag.
- Unngå unødvendig bruk av månedlig EAS-kvote.
- Kun kjøre ekstra build ved kritiske feil.

## Daglig flyt
1. Samle alle planlagte mobilendringer i løpet av dagen.
2. Test web først (hurtig test av login, dashboard, ordre, chat).
3. Kjør teknisk sjekk:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run test` (anbefalt ved større endringer)
4. Bekreft om endringen faktisk krever ny mobil-build:
   - Ja: native/Expo mobilkode endret (`mobile/*`) eller app-oppførsel i app påvirket.
   - Nei: kun web/backend-endringer kan ofte testes uten ny app-build.
5. Kjør dagens build (kun én):
   - `npm run release:android:preview`
6. Logg resultat (dato, build-lenke, hva som ble testet).

## Ekstra build samme dag (kun hvis kritisk)
Tillatt kun ved:
- Login-brudd
- Push-varsler fungerer ikke
- Crash eller alvorlig navigasjonsfeil
- Datatap/sikkerhetsfeil

Hvis ekstra build må kjøres:
1. Dokumenter hvorfor i loggen.
2. Avgrens fix til kritisk feil.
3. Verifiser med kort test-matrise før build.

## Forslag til enkel build-logg
Bruk tabellformat:

| Dato | Build type | Årsak | Testet | Lenke |
|---|---|---|---|---|
| 2026-02-25 | Android preview | Daglig planlagt | Login, chat, push | (lim inn URL) |

