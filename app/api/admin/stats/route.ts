import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";

export async function GET() {
  try {
    await requireRole(["ADMIN"]);

    const [activeOrders, completedOrders, landlords, workers] = await Promise.all([
      prisma.serviceOrder.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
      prisma.serviceOrder.count({ where: { status: "COMPLETED" } }),
      prisma.user.count({ where: { role: "UTLEIER", isActive: true } }),
      prisma.user.count({ where: { role: "TJENESTE", isActive: true } }),
    ]);

    return NextResponse.json({ activeOrders, completedOrders, landlords, workers });
  } catch (error) {
    return handleApiError(error);
  }
}