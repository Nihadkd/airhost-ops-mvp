import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError, apiError } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (session.user.role !== "ADMIN" && session.user.id !== id) {
      return apiError(403, "Forbidden");
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    if (!user) return apiError(404, "User not found");
    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "Invalid payload");
    }

    if (session.user.role !== "ADMIN") {
      if (session.user.id !== id) return apiError(403, "Forbidden");
      const ownUpdate = { name: parsed.data.name };
      const updated = await prisma.user.update({
        where: { id },
        data: ownUpdate,
        select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      });
      return NextResponse.json(updated);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return apiError(403, "Forbidden");
    const { id } = await params;

    await prisma.user.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}