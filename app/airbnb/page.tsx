import { AirbnbLegacyPage } from "@/components/airbnb-legacy-page";
import { prisma } from "@/lib/prisma";
import { splitOrderNote } from "@/lib/order-deadline";

export const dynamic = "force-dynamic";

export default async function AirbnbPage() {
  const jobs = await prisma.serviceOrder.findMany({
    where: {
      assignedToId: null,
      status: "PENDING",
      type: "KEY_HANDLING",
    },
    orderBy: { date: "asc" },
    take: 50,
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

  return <AirbnbLegacyPage jobs={publicJobs} />;
}
