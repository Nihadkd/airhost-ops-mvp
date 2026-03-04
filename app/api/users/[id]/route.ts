import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { handleApiError, apiError } from "@/lib/api";
import { userUpdateSchema } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const { id } = await params;
    if (!isAdmin && session.user.id !== id) {
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
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const { id } = await params;
    const body = await req.json();
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(400, "Invalid payload");
    }

    if (!isAdmin) {
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
    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    if (!isAdmin) return apiError(403, "Forbidden");
    const { id } = await params;
    if (id === session.user.id) return apiError(409, "Cannot delete your own user");

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!target) return apiError(404, "User not found");

    if (target.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (adminCount <= 1) return apiError(409, "Cannot delete last active admin");
    }

    await prisma.$transaction(async (tx) => {
      // Keep historic notification rows that reference this actor by nulling actor pointer first.
      await tx.notification.updateMany({
        where: { actorUserId: id },
        data: { actorUserId: null },
      });

      // Remove user-owned notifications.
      await tx.notification.deleteMany({ where: { userId: id } });

      // Remove user-generated content that has restrictive FKs.
      await tx.comment.deleteMany({ where: { userId: id } });
      await tx.message.deleteMany({
        where: {
          OR: [{ senderId: id }, { recipientId: id }],
        },
      });
      await tx.image.deleteMany({ where: { uploadedById: id } });
      await tx.review.deleteMany({
        where: {
          OR: [{ reviewerId: id }, { workerId: id }],
        },
      });

      // Orders where user is assigned should remain, but without assignment.
      await tx.serviceOrder.updateMany({
        where: { assignedToId: id },
        data: { assignedToId: null },
      });

      // Orders where user is landlord are removed together with cascading children.
      await tx.serviceOrder.deleteMany({ where: { landlordId: id } });

      await tx.pushDeviceToken.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
