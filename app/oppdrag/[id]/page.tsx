import Link from "next/link";
import { ServiceType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { ShareJobButton } from "@/components/share-job-button";
import { StatusBadge } from "@/components/status-badge";
import { auth } from "@/lib/auth";
import { splitOrderNote } from "@/lib/order-deadline";
import { assignmentStatuses } from "@/lib/order-assignment";
import { prisma } from "@/lib/prisma";
import { inferCity, inferCounty } from "@/lib/public-job-presentation";
import { appendReturnTo, normalizeReturnTo } from "@/lib/return-to";
import { isGuestCountServiceType } from "@/lib/service-types";
import { resolveUserRole } from "@/lib/user-role";

export const dynamic = "force-dynamic";

function getPublicServiceLabel(type: ServiceType) {
  switch (type) {
    case ServiceType.CLEANING:
      return "Rengjøring";
    case ServiceType.MOVING_CARRYING:
      return "Flytting og bæring";
    case ServiceType.GARDEN_WORK:
      return "Hagearbeid";
    case ServiceType.DELIVERY_TRANSPORT:
      return "Levering og transport";
    case ServiceType.SMALL_REPAIRS:
      return "Små reparasjoner";
    case ServiceType.PET_CARE:
      return "Dyrepass";
    case ServiceType.TECHNICAL_HELP:
      return "Teknisk hjelp";
    case ServiceType.KEY_HANDLING:
      return "Airbnb tjenester";
    case ServiceType.OTHER:
      return "Annet";
    default:
      return type;
  }
}

function getImageKindLabel(kind: string | null) {
  if (kind === "after") return "Etter";
  if (kind === "before") return "For";
  return "Bilde";
}

export default async function PublicJobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const session = await auth();
  const resolved = session?.user?.id ? await resolveUserRole(session.user.id).catch(() => null) : null;
  const returnTo = normalizeReturnTo(resolvedSearchParams.returnTo, "/#ledige-oppdrag");
  const job = await prisma.serviceOrder.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      orderNumber: true,
      type: true,
      address: true,
      date: true,
      note: true,
      details: true,
      status: true,
      updatedAt: true,
      guestCount: true,
      assignedToId: true,
      assignmentStatus: true,
      landlordId: true,
      landlord: { select: { name: true } },
      images: {
        select: {
          id: true,
          url: true,
          kind: true,
          caption: true,
          uploadedBy: { select: { name: true } },
          comments: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!job) {
    notFound();
  }

  const isPubliclyVisible = job.assignedToId === null && job.status === "PENDING";

  const canOpenDirectly =
    Boolean(session?.user?.id) &&
    Boolean(
      resolved &&
        (session?.user?.role === "ADMIN" ||
          resolved.role === "ADMIN" ||
          (resolved.role === "UTLEIER" && job.landlordId === session?.user?.id) ||
          (resolved.role === "TJENESTE" &&
            (job.assignedToId === session?.user?.id ||
              (job.assignedToId === null && job.status === "PENDING" && job.assignmentStatus === assignmentStatuses.UNASSIGNED)))),
    );

  if (canOpenDirectly) {
    redirect(appendReturnTo(`/orders/${job.id}`, returnTo));
  }

  if (!isPubliclyVisible) {
    const privateLoginHref = `/login?reason=login-required&callbackUrl=${encodeURIComponent(`/orders/${job.id}`)}`;

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-7">
            <Link href={returnTo} className="inline-flex items-center gap-3" aria-label="ServNest">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b8f7b,#12303d)] text-white shadow-lg">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="currentColor" />
                </svg>
              </span>
              <div className="leading-tight">
                <p className="text-base font-black uppercase tracking-[0.28em] text-teal-700">ServNest</p>
                <p className="text-xs font-semibold text-slate-500">Delt jobb</p>
              </div>
            </Link>
          </header>

          <section className="rounded-[30px] border border-[#d7e7ea] bg-white px-6 py-7 shadow-[0_20px_60px_rgba(15,48,61,0.10)] sm:px-8">
            <span className="rounded-full bg-amber-100 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-amber-900">
              Ikke offentlig tilgjengelig
            </span>
            <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900">
              Denne jobben kan ikke vises offentlig lenger
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              Jobben finnes fortsatt, men den er ikke lenger aapen for offentlig visning. Hvis du er riktig part for jobben,
              kan du logge inn for aa aapne den internt.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={privateLoginHref} className="btn btn-primary">
                Logg inn for aa aapne jobben
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const split = splitOrderNote(job.note);
  const summary = split.note || job.note?.trim() || "Detaljer om oppdraget kommer her.";
  const details = job.details?.trim() || split.note || "";
  const deadlineAt = split.deadlineAt;
  const typeLabel = getPublicServiceLabel(job.type);
  const city = inferCity(job.address);
  const county = inferCounty(job.address);
  const callbackUrl = appendReturnTo(`/oppdrag/${job.id}`, returnTo);
  const loginHref = `/login?reason=login-required&callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`;
  const actionHref = session?.user?.id ? appendReturnTo(`/orders/${job.id}`, returnTo) : loginHref;
  const assignmentStatusLabel =
    job.assignmentStatus === assignmentStatuses.PENDING_WORKER_ACCEPTANCE
      ? "Venter på svar fra tjenesteutfører"
      : job.assignmentStatus === assignmentStatuses.PENDING_LANDLORD_APPROVAL
        ? "Venter på godkjenning fra utleier"
        : job.assignmentStatus === assignmentStatuses.CONFIRMED
          ? "Tildeling bekreftet"
          : "Ikke tildelt";
  const assignmentStatusHint =
    job.assignmentStatus === assignmentStatuses.PENDING_WORKER_ACCEPTANCE
      ? "Oppdraget er tildelt en tjenesteutfører og venter på at vedkommende skal godta."
      : job.assignmentStatus === assignmentStatuses.PENDING_LANDLORD_APPROVAL
        ? "En tjenesteutfører har tatt et åpent oppdrag og venter på godkjenning fra utleier."
        : job.assignmentStatus === assignmentStatuses.CONFIRMED
          ? "Tildelingen er bekreftet."
          : "Oppdraget er åpent og kan tas av en tjenesteutfører.";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_24px_80px_rgba(10,45,61,0.10)] backdrop-blur sm:px-7">
          <Link href={returnTo} className="inline-flex items-center gap-3" aria-label="ServNest">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0b8f7b,#12303d)] text-white shadow-lg">
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11.8 12 5l8 6.8V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z" fill="currentColor" />
              </svg>
            </span>
            <div className="leading-tight">
              <p className="text-base font-black uppercase tracking-[0.28em] text-teal-700">ServNest</p>
              <p className="text-xs font-semibold text-slate-500">Offentlig oppdrag</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ShareJobButton urlPath={`/oppdrag/${job.id}`} />
          </div>
        </header>

        <section className="rounded-[30px] border border-[#d7e7ea] bg-white px-6 py-7 shadow-[0_20px_60px_rgba(15,48,61,0.10)] sm:px-8">
          {typeof job.orderNumber === "number" ? (
            <p className="mb-2 text-sm font-semibold text-slate-600">
              Ordrenummer: <span className="text-slate-900">#{job.orderNumber}</span>
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-800">
                {typeLabel}
              </span>
              <StatusBadge status={job.status} />
            </div>
            {typeof job.orderNumber === "number" ? (
              <span className="text-sm font-semibold text-slate-500">#{job.orderNumber}</span>
            ) : null}
          </div>

          <h1 className="mt-5 whitespace-pre-wrap break-words text-3xl font-black leading-tight text-slate-900">
            {summary}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {typeLabel} | {job.address}
          </p>
          <p className="text-sm text-slate-600">
            {new Date(job.date).toLocaleString("nb-NO", { hour12: false })}
          </p>
          {deadlineAt ? (
            <p className="text-sm text-slate-600">
              Frist: {new Date(deadlineAt).toLocaleString("nb-NO", { hour12: false })}
            </p>
          ) : null}
          {job.status === "COMPLETED" ? (
            <p className="text-sm text-slate-600">
              Fullført: {new Date(job.updatedAt).toLocaleString("nb-NO", { hour12: false })}
            </p>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">By</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{city}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Adresse</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{job.address}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Område</p>
              <p className="mt-2 text-lg font-bold text-slate-900">{county}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)]">
            {session?.user?.id ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group block overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-sm transition hover:border-teal-400 hover:shadow"
              >
                <iframe
                  title="Kartforhåndsvisning"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(job.address)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="pointer-events-none h-[120px] w-full border-0"
                />
                <div className="flex items-center justify-between border-t border-slate-200 bg-teal-50 px-3 py-2 text-[11px] font-semibold text-teal-900">
                  <span>Mini kart</span>
                  <span className="underline decoration-transparent group-hover:decoration-current">Åpne kart</span>
                </div>
              </a>
            ) : (
              <div className="group block overflow-hidden rounded-2xl border border-teal-300 bg-white shadow-sm transition hover:border-teal-400 hover:shadow">
                <iframe
                  title="Kartforhåndsvisning"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(job.address)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="pointer-events-none h-[120px] w-full border-0"
                />
                <div className="flex items-center justify-between border-t border-slate-200 bg-teal-50 px-3 py-2 text-[11px] font-semibold text-teal-900">
                  <span>Mini kart</span>
                  <span className="underline decoration-transparent group-hover:decoration-current">Logg inn for kart</span>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm">
              <p className="font-semibold text-slate-900">
                Utleier:{" "}
                {session?.user?.id ? (
                  <Link href={`/users/${job.landlordId}`} className="font-bold underline">
                    {job.landlord.name}
                  </Link>
                ) : (
                  <span className="font-bold">
                    {job.landlord.name}
                  </span>
                )}
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                Tildelt: <span className="font-bold">{job.assignedToId ? "Ja" : "Ingen"}</span>
              </p>
              <p className="mt-3 font-semibold text-slate-900">Tildelingsstatus: {assignmentStatusLabel}</p>
              <p className="mt-1 text-slate-600">{assignmentStatusHint}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Tidspunkt</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {new Date(job.date).toLocaleString("nb-NO", { hour12: false })}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Hva jobben innebærer</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-base font-medium leading-7 text-slate-800">
              {details || "Detaljert beskrivelse kommer her."}
            </p>
          </div>

          {isGuestCountServiceType(job.type) && job.guestCount ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
              <div
                className="flex max-w-full items-center justify-between rounded-md border-2 border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-200"
                style={{ width: 160, height: 40, paddingInline: 10 }}
              >
                <span className="font-bold uppercase text-amber-900" style={{ fontSize: 10, letterSpacing: "0.05em" }}>
                  Antall gjester
                </span>
                <span
                  className="rounded-md bg-amber-200 font-extrabold leading-none text-amber-950"
                  style={{ fontSize: 18, padding: "4px 7px" }}
                >
                  {job.guestCount}
                </span>
              </div>
            </div>
          ) : null}

          {session?.user?.id ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={actionHref} className="btn btn-primary">
                Åpne oppdrag
              </Link>
              <Link href={loginHref} className="btn btn-secondary">
                Skriv melding
              </Link>
              <Link
                href={mapHref}
                className="btn btn-secondary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Åpne kart
              </Link>
              <Link href="/orders/new" className="btn btn-secondary">
                Legg ut jobb
              </Link>
            </div>
          ) : (
            <div className="mt-8">
              <Link href={loginHref} className="btn btn-primary">
                Ta oppdrag
              </Link>
            </div>
          )}
        </section>

        <section className="panel p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Privat chat</h2>
            <span className="text-xs text-slate-500">Kun mellom utleier og tjenesteutfører</span>
          </div>
          <p className="text-sm text-slate-600">
            {session?.user?.id
              ? "Chat aktiveres automatisk når oppdraget er tatt og bekreftet."
              : "Logg inn for å se og sende meldinger om dette oppdraget."}
          </p>
        </section>

        <section className="panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Bilde</h2>
          <p className="mt-1 text-sm text-slate-600">
            {session?.user?.id
              ? "Du kan laste opp dokumentasjon når du er inne på oppdraget."
              : "Logg inn for å laste opp og kommentere bilder."}
          </p>
          {session?.user?.id ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href={loginHref} className="btn btn-secondary">
                Ta bilde
              </Link>
              <Link href={loginHref} className="btn btn-secondary">
                Legg ved
              </Link>
              <Link href={loginHref} className="btn btn-primary">
                Last opp
              </Link>
            </div>
          ) : null}
        </section>

        {job.images.length === 0 ? (
          <section className="panel p-4 sm:p-5">
            <h2 className="text-lg font-semibold">Bilder</h2>
            <p className="mt-1 text-sm text-slate-500">Ingen bilder lastet opp ennå.</p>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="px-1 text-lg font-semibold text-slate-900">Bilder</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {job.images.map((image) => (
                <div key={image.id} className="panel p-4">
                  <div className="relative h-56 w-full overflow-hidden rounded">
                    <img src={image.url} alt="Jobbbilde" className="h-56 w-full object-cover" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs uppercase text-slate-500">{getImageKindLabel(image.kind)}</p>
                    {session?.user?.id ? (
                      <Link href={loginHref} className="text-sm font-semibold text-teal-700 underline">
                        Kommenter
                      </Link>
                    ) : null}
                  </div>
                  <p className="text-sm">{image.caption || "Ingen kommentar."}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Lastet opp av {image.uploadedBy?.name || "ukjent bruker"} | Kommentarer: {image.comments.length}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
