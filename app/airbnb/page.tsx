import type { Metadata } from "next";
import { AirbnbLegacyPage } from "@/components/airbnb-legacy-page";
import { auth } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { splitOrderNote } from "@/lib/order-deadline";
import { resolveUserRole } from "@/lib/user-role";

export const metadata: Metadata = buildMetadata({
  title: "Airbnb tjenester | Ledige oppdrag og hjelp mellom gjester",
  description:
    "Se ledige Airbnb-oppdrag og finn hjelp til nokkelhandtering, vask, klargjoring og praktisk gjesteflyt med ServNest.",
  path: "/airbnb",
  keywords: ["airbnb tjenester", "nokkelhandtering", "airbnb vask", "gjesteflyt"],
});

export const dynamic = "force-dynamic";

export default async function AirbnbPage() {
  const session = await auth();
  const resolved = session?.user?.id ? await resolveUserRole(session.user.id).catch(() => null) : null;
  const jobs = await prisma.serviceOrder.findMany({
    where: {
      assignedToId: null,
      status: "PENDING",
      type: "KEY_HANDLING",
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      orderNumber: true,
      address: true,
      date: true,
      createdAt: true,
      updatedAt: true,
      note: true,
      details: true,
      guestCount: true,
      landlord: { select: { name: true } },
    },
  });

  const publicJobs = jobs.map((job) => {
    const split = splitOrderNote(job.note);
    return {
      ...job,
      date: job.date.toISOString(),
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      note: split.note,
    };
  });

  return (
    <AirbnbLegacyPage
      jobs={publicJobs}
      isAuthenticated={Boolean(session?.user?.id)}
      me={
        session?.user?.id && resolved
          ? {
              name: session.user.name,
              accountRole: session.user.role,
              effectiveRole: resolved.role,
            }
          : null
      }
    />
  );
}
