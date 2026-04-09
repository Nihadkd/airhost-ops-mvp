import type { Metadata } from "next";
import { AirbnbLegacyPage } from "@/components/airbnb-legacy-page";
import { auth } from "@/lib/auth";
import { buildMetadata } from "@/lib/seo";
import { getCachedPublicAirbnbJobs } from "@/lib/public-job-cache";
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
  const sessionPromise = auth();
  const publicJobsPromise = getCachedPublicAirbnbJobs();

  const session = await sessionPromise;
  const resolvedPromise = session?.user?.id ? resolveUserRole(session.user.id).catch(() => null) : Promise.resolve(null);
  const [publicJobs, resolved] = await Promise.all([publicJobsPromise, resolvedPromise]);

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
