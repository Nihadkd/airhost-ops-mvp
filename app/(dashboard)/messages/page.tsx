import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { MessagesPageClient } from "@/components/messages-page-client";

export default async function MessagesPage() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    redirect("/login");
  }
  const isAdminAccount = session.user.accountRole === "ADMIN";

  const where =
    isAdminAccount || session.user.role === "ADMIN"
      ? {}
      : {
          OR: [{ landlordId: session.user.id }, { assignedToId: session.user.id }],
        };

  const orders = await prisma.serviceOrder.findMany({
    where,
    select: {
      id: true,
      address: true,
      type: true,
      date: true,
      landlord: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { text: true, createdAt: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  const conversations = orders
    .filter((order) => isAdminAccount || session.user.role === "ADMIN" || order.messages.length > 0)
    .map((order) => ({
      id: order.id,
      address: order.address,
      type: order.type,
      date: order.date.toISOString(),
      landlord: order.landlord,
      assignedTo: order.assignedTo,
      lastMessage: order.messages[0] ? { text: order.messages[0].text, createdAt: order.messages[0].createdAt } : null,
    }));

  return (
    <MessagesPageClient
      conversations={conversations}
      currentUserId={session.user.id}
      currentRole={session.user.role}
      isAdmin={isAdminAccount || session.user.role === "ADMIN"}
    />
  );
}
