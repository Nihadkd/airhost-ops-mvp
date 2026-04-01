# AirHost Ops MVP (Next.js + Prisma)

Produksjonsklar MVP v1 for intern drift av Airbnb-tjenester.

## Stack
- Next.js (App Router) + TypeScript
- TailwindCSS
- Prisma ORM
- Prisma Postgres lokalt via `prisma dev`
- NextAuth (Credentials + JWT session)
- Zustand (popup-varsler)

## Roller
- `UTLEIER`
- `TJENESTE`
- `ADMIN`

RBAC er implementert i API-ruter, middleware og UI.

## Funksjoner
- Auth: registrering, innlogging, JWT session
- Oppdrag: full CRUD + tildeling
- Bilder: opplasting (lokal lagring) + CRUD
- Kommentarer: CRUD på bilder
- Varsler: popup ved neste login + markering som lest
- Admin: brukerstyring (opprett/deaktiver/rolle), dashboard-statistikk
- Seed-data for testbrukere

## Prosjektstruktur
- `app/api/*` API-ruter
- `app/(auth)/*` auth-sider
- `app/(dashboard)/*` rollebaserte dashboard-sider
- `components/*` UI-komponenter
- `lib/*` auth, prisma, rbac, validering, upload
- `prisma/schema.prisma` datamodeller
- `prisma/seed.cjs` seed data
- `tests/api/*` endpoint-tester

## Miljovariabler
Kopier `.env.example` til `.env`.

```env
DATABASE_URL="prisma+postgres://localhost:51217/?api_key=..."
DATABASE_URL_UNPOOLED="postgres://postgres:postgres@localhost:51218/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0"
NEXTAUTH_SECRET="replace-with-strong-secret"
NEXTAUTH_URL="http://localhost:3000"
```

## Kjoring lokalt
```bash
npm install
npm run db:local:start
npm run db:local:reset
npm run db:seed
npm run dev
```

## Test
```bash
npm run test
```

## Full verifisering (anbefalt før deploy)
Kjorer:
- database reset + seed
- tester
- lint
- typecheck
- build
- live smoke-test av `api/health` og brukerregistrering

```bash
npm run verify:all
```

## Prod
```bash
npm run build
npm run start
```

## Seed brukere
- Admin: `admin@airhost.no` / `Admin123!`
- Utleier: `utleier@airhost.no` / `Utleier123!`
- Tjeneste: `tjeneste@airhost.no` / `Tjeneste123!`

## Videre skalering
- `lib/payments/provider.ts` klargjort for betaling-integrasjon
- Bytt til annen PostgreSQL-instans ved a oppdatere `DATABASE_URL` og `DATABASE_URL_UNPOOLED`
- Bytt bildeflyt til Cloudinary ved a erstatte `lib/upload.ts`
