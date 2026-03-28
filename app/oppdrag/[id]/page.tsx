import Link from "next/link";
import { ServiceType } from "@prisma/client";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ShareJobButton } from "@/components/share-job-button";
import { splitOrderNote } from "@/lib/order-deadline";
import { assignmentStatuses } from "@/lib/order-assignment";
import { prisma } from "@/lib/prisma";
import { inferCity, inferCounty } from "@/lib/public-job-presentation";
import { appendReturnTo, normalizeReturnTo } from "@/lib/return-to";
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
  const job = await prisma.serviceOrder.findFirst({
    where: {
      id,
      assignedToId: null,
      status: "PENDING",
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
      assignedToId: true,
      assignmentStatus: true,
      landlordId: true,
      landlord: { select: { name: true } },
    },
  });

  if (!job) {
    notFound();
  }

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

  const split = splitOrderNote(job.note);
  const summary = split.note || job.note?.trim() || "Detaljer om oppdraget kommer her.";
  const details = job.details?.trim() || split.note || "";
  const typeLabel = getPublicServiceLabel(job.type);
  const city = inferCity(job.address);
  const county = inferCounty(job.address);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f4fbfb_0%,#eff6f8_32%,#ffffff_100%)] px-4 pb-16 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
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
            <Link href={returnTo} className="btn btn-secondary">
              Tilbake
            </Link>
          </div>
        </header>

        <section className="mt-6 rounded-[30px] border border-[#d7e7ea] bg-white px-6 py-7 shadow-[0_20px_60px_rgba(15,48,61,0.10)] sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="rounded-full bg-teal-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-teal-800">
              {typeLabel}
            </span>
            <span className="text-sm font-semibold text-slate-500">#{job.orderNumber}</span>
          </div>

          <h1 className="mt-5 text-3xl font-black leading-tight text-slate-900">{summary}</h1>

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

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Tidspunkt</p>
            <p className="mt-2 text-lg font-bold text-slate-900">
              {new Date(job.date).toLocaleString("nb-NO", { hour12: false })}
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Utlyst av</p>
            <p className="mt-2 text-lg font-bold text-slate-900">{job.landlord.name}</p>
          </div>

          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-4">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Hva jobben innebærer</p>
            <p className="mt-2 whitespace-pre-line text-base font-medium leading-7 text-slate-800">
              {details || "Detaljert beskrivelse kommer her."}
            </p>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {session?.user?.id ? (
              <>
                <Link href={appendReturnTo(`/orders/${job.id}`, returnTo)} className="btn btn-primary">
                  Åpne oppdrag
                </Link>
                <Link href="/orders/new" className="btn btn-secondary">
                  Legg ut jobb
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-primary">
                  Logg inn for å ta oppdrag
                </Link>
                <Link href="/login" className="btn btn-secondary">
                  Logg inn for mer informasjon
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
