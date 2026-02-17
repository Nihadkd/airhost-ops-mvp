import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) return apiError(404, "Image not found");

    const canEdit = session.user.role === "ADMIN" || image.uploadedById === session.user.id;
    if (!canEdit) return apiError(403, "Forbidden");

    const body = await req.json();
    const updated = await prisma.image.update({
      where: { id },
      data: {
        caption: typeof body.caption === "string" ? body.caption : undefined,
        kind: typeof body.kind === "string" ? body.kind : undefined,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const image = await prisma.image.findUnique({ where: { id } });
    if (!image) return apiError(404, "Image not found");

    const canDelete = session.user.role === "ADMIN" || image.uploadedById === session.user.id;
    if (!canDelete) return apiError(403, "Forbidden");

    await prisma.image.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}