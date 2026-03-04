import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { UserPublicProfileClient } from "@/components/user-public-profile-client";
import { getTranslation } from "@/lib/language-context";

export default async function UserPublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }
  const userLanguage = (session.user as { language?: string }).language;
  const t = getTranslation(userLanguage === "en" ? "en" : "no");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) {
    return <div className="panel p-5">{t("notFoundUserPanel")}</div>;
  }

  const reviews = await prisma.review.findMany({
    where: { workerId: id },
    include: { reviewer: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return <UserPublicProfileClient user={{ id: user.id, name: user.name, role: user.role }} reviews={reviews} />;
}
