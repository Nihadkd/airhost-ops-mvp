import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveUserRole } from "@/lib/user-role";
import { OrderDetailClient } from "@/components/order-detail-client";

export default async function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      landlord: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      images: {
        include: {
          uploadedBy: { select: { id: true, name: true, role: true } },
          comments: {
            include: { user: { select: { id: true, name: true, role: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      messages: {
        include: {
          sender: { select: { id: true, name: true, role: true } },
          recipient: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order || !session) {
    return <div className="panel p-5">Fant ikke oppdrag.</div>;
  }

  const resolved = await resolveUserRole(session.user.id);
  const role = resolved.role;

  const allowed =
    role === "ADMIN" ||
    (role === "UTLEIER" && order.landlordId === session.user.id) ||
    (role === "TJENESTE" && (order.assignedToId === session.user.id || (!order.assignedToId && order.status === "PENDING")));

  if (!allowed) return <div className="panel p-5">Ingen tilgang.</div>;

  const workers =
    role === "ADMIN"
      ? await prisma.user.findMany({ where: { canService: true, isActive: true }, select: { id: true, name: true, role: true } })
      : [];

  return <OrderDetailClient initialOrder={order} role={role} workers={workers} currentUserId={session.user.id} />;
}
