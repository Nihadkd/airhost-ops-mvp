import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { splitOrderNote } from "@/lib/order-deadline";

export const PUBLIC_HOME_JOBS_TAG = "public-home-jobs";
export const PUBLIC_AIRBNB_JOBS_TAG = "public-airbnb-jobs";
const PUBLIC_JOBS_REVALIDATE_SECONDS = 15;

export type CachedPublicHomeJob = {
  id: string;
  orderNumber: number;
  type: string;
  address: string;
  date: string;
  note: string | null;
};

export type CachedPublicAirbnbJob = {
  id: string;
  orderNumber: number;
  address: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  note: string | null;
  details: string | null;
  guestCount: number | null;
  landlord: { name: string };
};

const fetchPublicHomeJobs = unstable_cache(
  async (): Promise<CachedPublicHomeJob[]> => {
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

    return jobs.map((job) => {
      const split = splitOrderNote(job.note);
      return {
        ...job,
        date: job.date.toISOString(),
        note: split.note,
      };
    });
  },
  [PUBLIC_HOME_JOBS_TAG],
  {
    revalidate: PUBLIC_JOBS_REVALIDATE_SECONDS,
    tags: [PUBLIC_HOME_JOBS_TAG],
  },
);

const fetchPublicAirbnbJobs = unstable_cache(
  async (): Promise<CachedPublicAirbnbJob[]> => {
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

    return jobs.map((job) => {
      const split = splitOrderNote(job.note);
      return {
        ...job,
        date: job.date.toISOString(),
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        note: split.note,
        landlord: { name: job.landlord?.name ?? "" },
      };
    });
  },
  [PUBLIC_AIRBNB_JOBS_TAG],
  {
    revalidate: PUBLIC_JOBS_REVALIDATE_SECONDS,
    tags: [PUBLIC_AIRBNB_JOBS_TAG],
  },
);

export async function getCachedPublicHomeJobs() {
  return fetchPublicHomeJobs();
}

export async function getCachedPublicAirbnbJobs() {
  return fetchPublicAirbnbJobs();
}

export function revalidatePublicJobListings() {
  try {
    revalidateTag(PUBLIC_HOME_JOBS_TAG, "max");
    revalidateTag(PUBLIC_AIRBNB_JOBS_TAG, "max");
  } catch {
    // Ignore environments where tag revalidation is unavailable, such as isolated unit tests.
  }
}
