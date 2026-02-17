import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return apiError(404, "Comment not found");

    const canEdit = session.user.role === "ADMIN" || comment.userId === session.user.id;
    if (!canEdit) return apiError(403, "Forbidden");

    const body = await req.json();
    if (!body.text || typeof body.text !== "string") return apiError(400, "Invalid text");

    const updated = await prisma.comment.update({ where: { id }, data: { text: body.text } });
    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) return apiError(404, "Comment not found");

    const canDelete = session.user.role === "ADMIN" || comment.userId === session.user.id;
    if (!canDelete) return apiError(403, "Forbidden");

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}