import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { commentCreateSchema } from "@/lib/validators";

async function canAccessImage(userId: string, role: string, imageId: string) {
  const image = await prisma.image.findUnique({ where: { id: imageId }, include: { order: true } });
  if (!image) return false;
  if (role === "ADMIN") return true;
  if (role === "UTLEIER" && image.order.landlordId === userId) return true;
  if (role === "TJENESTE" && image.order.assignedToId === userId) return true;
  return false;
}

export async function GET(req: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("imageId");
    if (!imageId) return apiError(400, "Missing imageId");

    const allowed = await canAccessImage(session.user.id, session.user.role, imageId);
    if (!allowed) return apiError(403, "Forbidden");

    const comments = await prisma.comment.findMany({
      where: { imageId },
      include: { user: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();
    const data = commentCreateSchema.parse(body);

    const allowed = await canAccessImage(session.user.id, session.user.role, data.imageId);
    if (!allowed) return apiError(403, "Forbidden");

    const comment = await prisma.comment.create({
      data: {
        imageId: data.imageId,
        text: data.text,
        userId: session.user.id,
      },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}