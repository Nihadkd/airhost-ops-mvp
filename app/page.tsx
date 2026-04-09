import type { Metadata } from "next";
import { PublicHomePage } from "@/components/public-home-page";
import { auth } from "@/lib/auth";
import { getCachedPublicHomeJobs } from "@/lib/public-job-cache";
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
  const sessionPromise = auth();
  const publicJobsPromise = getCachedPublicHomeJobs();

  const session = await sessionPromise;
  const resolvedPromise = session?.user?.id ? resolveUserRole(session.user.id).catch(() => null) : Promise.resolve(null);
  const [publicJobs, resolved] = await Promise.all([publicJobsPromise, resolvedPromise]);

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
