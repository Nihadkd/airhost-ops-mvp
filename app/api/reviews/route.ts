import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { reviewCreateSchema } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const workerId = url.searchParams.get("workerId");
    if (!workerId) return apiError(400, "workerId is required");

    const reviews = await prisma.review.findMany({
      where: { workerId },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(reviews);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth({ request: req, requireTrustedOrigin: true });
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const body = await req.json();
    const parsed = reviewCreateSchema.safeParse(body);
    if (!parsed.success) return apiError(400, "Invalid payload");

    const { workerId, orderId, rating, comment } = parsed.data;

    if (session.user.id === workerId) {
      return apiError(400, "Cannot review yourself");
    }

    if (orderId) {
      const order = await prisma.serviceOrder.findUnique({
        where: { id: orderId },
        select: { landlordId: true, assignedToId: true, status: true },
      });
      if (!order) return apiError(404, "Order not found");
      if (order.status !== "COMPLETED") return apiError(409, "Order must be completed before review");
      if (order.assignedToId !== workerId) return apiError(409, "Review target does not match assigned worker");
      if (!isAdmin && order.landlordId !== session.user.id) return apiError(403, "Forbidden");
    }

    const review = await prisma.review.create({
      data: {
        reviewerId: session.user.id,
        workerId,
        orderId: orderId ?? null,
        rating,
        comment,
      },
      include: { reviewer: { select: { id: true, name: true } } },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
