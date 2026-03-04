import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/rbac";
import { apiError, handleApiError } from "@/lib/api";
import { buildReceiptHtml } from "@/lib/receipt";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const order = await prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        landlord: { select: { id: true, name: true } },
        receipt: true,
      },
    });
    if (!order || !order.receipt) return apiError(404, "Receipt not found");

    const isAdmin = session.user.accountRole === "ADMIN" || session.user.role === "ADMIN";
    const canView = isAdmin || order.landlordId === session.user.id || order.assignedToId === session.user.id;
    if (!canView) return apiError(403, "Forbidden");

    const html = buildReceiptHtml({
      receiptNumber: order.receipt.receiptNumber,
      paidAt: order.receipt.paidAt,
      amountNok: order.receipt.amountNok,
      recipientName: order.receipt.recipientName,
      recipientEmail: order.receipt.recipientEmail,
      orderNumber: order.orderNumber,
      orderType: order.type,
      address: order.address,
      note: order.receipt.note,
    });

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="receipt-${order.receipt.receiptNumber}.html"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
