import type { Metadata } from "next";
import { PublicHomePage } from "@/components/public-home-page";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitOrderNote } from "@/lib/order-deadline";
import { buildMetadata } from "@/lib/seo";
import { resolveUserRole } from "@/lib/user-role";

export const metadata: Metadata = buildMetadata({
  title: "ServNest | Lokale tjenester og smajobber",
  description:
    "ServNest hjelper deg a finne lokal hjelp til rengjoring, sma reparasjoner, flyttehjelp, hagearbeid, teknisk hjelp, dyrepass og Airbnb-tjenester.",
  path: "/",
  keywords: [
    "lokal hjelp",
    "smajobber",
    "sma reparasjoner",
    "rengjoring",
    "flyttehjelp",
    "hagearbeid",
    "airbnb tjenester",
  ],
});

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const resolved = session?.user?.id ? await resolveUserRole(session.user.id).catch(() => null) : null;
  const jobs = await prisma.serviceOrder.findMany({
    where: {
      assignedToId: null,
      status: "PENDING",
    },
    orderBy: { date: "asc" },
    select: {
      id: true,
      orderNumber: true,
      type: true,
      address: true,
      date: true,
      note: true,
    },
  });

  const publicJobs = jobs.map((job) => {
    const split = splitOrderNote(job.note);
    return {
      ...job,
      date: job.date.toISOString(),
      note: split.note,
    };
  });

  return (
    <PublicHomePage
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
