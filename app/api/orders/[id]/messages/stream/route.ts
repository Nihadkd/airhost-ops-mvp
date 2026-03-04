import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

async function canAccessOrderChat(orderId: string, userId: string, role: string, isAdmin: boolean) {
  if (isAdmin || role === "ADMIN") return true;

  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: { landlordId: true, assignedToId: true },
  });
  if (!order) return false;
  return order.landlordId === userId || order.assignedToId === userId;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const { id } = await params;

    const isAllowed = await canAccessOrderChat(id, session.user.id, session.user.role, isAdmin);
    if (!isAllowed) return apiError(403, "Forbidden");

    const initialLatest = await prisma.message.findFirst({
      where: { orderId: id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, id: true },
    });

    const encoder = new TextEncoder();
    let closed = false;
    let latestId = initialLatest?.id ?? "";
    const startedAt = Date.now();

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`));

        const tick = async () => {
          while (!closed) {
            const latest = await prisma.message.findFirst({
              where: { orderId: id },
              orderBy: { createdAt: "desc" },
              select: { id: true, createdAt: true },
            });

            if (latest?.id && latest.id !== latestId) {
              latestId = latest.id;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "message", createdAt: latest.createdAt })}\n\n`),
              );
            } else {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ping" })}\n\n`));
            }

            if (Date.now() - startedAt > 55_000) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "reconnect" })}\n\n`));
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          controller.close();
        };

        void tick();
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
