import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStartAvailabilityForWorker } from "@/lib/services/order-start-service";
import { resolveUserRole } from "@/lib/user-role";
import { OrderDetailClient } from "@/components/order-detail-client";
import { splitOrderNote } from "@/lib/order-deadline";
import { normalizeReturnTo } from "@/lib/return-to";

export default async function OrderDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const session = await auth();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);

  const order = await prisma.serviceOrder.findUnique({
    where: { id },
    include: {
      landlord: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true, reviewsReceived: { select: { rating: true } } } },
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
    },
  });

  if (!order || !session) {
    return <div className="panel p-5">Fant ikke oppdrag.</div>;
  }

  const resolved = await resolveUserRole(session.user.id);
  const role = resolved.role;
  const isAdminAccount = session.user.role === "ADMIN";
  const defaultBackHref = role === "UTLEIER" || role === "ADMIN" ? "/orders/my" : "/#ledige-oppdrag";
  const backHref = normalizeReturnTo(resolvedSearchParams.returnTo, defaultBackHref);

  const allowed =
    isAdminAccount ||
    role === "ADMIN" ||
    (role === "UTLEIER" && order.landlordId === session.user.id) ||
    (role === "TJENESTE" &&
      (order.assignedToId === session.user.id ||
        (!order.assignedToId && order.status === "PENDING" && order.assignmentStatus === "UNASSIGNED")));

  if (!allowed) return <div className="panel p-5">Ingen tilgang.</div>;

  const workers =
    isAdminAccount || role === "ADMIN"
      ? await prisma.user.findMany({
          where: { canService: true, isActive: true },
          select: { id: true, name: true, role: true, reviewsReceived: { select: { rating: true } } },
        })
      : [];

  const withRating = <T extends { reviewsReceived: Array<{ rating: number }> }>(user: T) => {
    const reviewCount = user.reviewsReceived.length;
    const averageRating = reviewCount
      ? Number((user.reviewsReceived.reduce((sum, review) => sum + review.rating, 0) / reviewCount).toFixed(1))
      : null;
    return { ...user, averageRating, reviewCount };
  };

  const parsedOrderNote = splitOrderNote(order.note);
  const orderWithRating = {
    ...order,
    note: parsedOrderNote.note,
    deadlineAt: parsedOrderNote.deadlineAt,
    assignedTo: order.assignedTo ? withRating(order.assignedTo) : null,
  };
  const startAvailability =
    role === "TJENESTE" && order.assignedToId === session.user.id
      ? await getStartAvailabilityForWorker(order.id, session.user.id)
      : { canStart: false, blockedByOrderId: null, blockedByOrderNumber: null };
  const workersWithRating = workers.map(withRating);

  return (
    <OrderDetailClient
      initialOrder={{
        ...orderWithRating,
        messages: [],
        assignmentStatus: order.assignmentStatus,
        canStart: startAvailability.canStart,
        startBlockedByOrderId: startAvailability.blockedByOrderId,
        startBlockedByOrderNumber: startAvailability.blockedByOrderNumber,
      }}
      role={isAdminAccount ? "ADMIN" : role}
      workers={workersWithRating}
      currentUserId={session.user.id}
      backHref={backHref}
    />
  );
}
