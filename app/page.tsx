import { PublicHomePage } from "@/components/public-home-page";
import { prisma } from "@/lib/prisma";
import { splitOrderNote } from "@/lib/order-deadline";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const jobs = await prisma.serviceOrder.findMany({
    where: {
      assignedToId: null,
      status: "PENDING",
    },
    orderBy: { date: "asc" },
    take: 20,
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

  return <PublicHomePage jobs={publicJobs} />;
}
