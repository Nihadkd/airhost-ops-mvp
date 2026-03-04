import { prisma } from "@/lib/prisma";
import { buildReceiptHtml, createReceiptNumber } from "@/lib/receipt";
import { sendMail } from "@/lib/mailer";

type OrderForReceipt = {
  id: string;
  orderNumber: number;
  type: string;
  address: string;
  landlord: { name: string; email: string };
};

export async function issueOrderReceipt(input: {
  order: OrderForReceipt;
  amountNok: number;
  paidAt?: Date;
  note?: string | null;
}) {
  const paidAt = input.paidAt ?? new Date();
  const receiptNumber = createReceiptNumber(input.order.orderNumber, paidAt);
  const receipt = await prisma.receipt.upsert({
    where: { orderId: input.order.id },
    update: {
      amountNok: input.amountNok,
      paidAt,
      note: input.note?.trim() || null,
      receiptNumber,
      recipientName: input.order.landlord.name,
      recipientEmail: input.order.landlord.email,
    },
    create: {
      orderId: input.order.id,
      receiptNumber,
      amountNok: input.amountNok,
      paidAt,
      note: input.note?.trim() || null,
      recipientName: input.order.landlord.name,
      recipientEmail: input.order.landlord.email,
    },
  });

  const html = buildReceiptHtml({
    receiptNumber: receipt.receiptNumber,
    paidAt: receipt.paidAt,
    amountNok: receipt.amountNok,
    recipientName: receipt.recipientName,
    recipientEmail: receipt.recipientEmail,
    orderNumber: input.order.orderNumber,
    orderType: input.order.type,
    address: input.order.address,
    note: receipt.note,
  });

  const landlordMail = await sendMail({
    to: input.order.landlord.email,
    subject: `ServNest kvittering ${receipt.receiptNumber}`,
    html,
  });
  const adminEmail = process.env.RECEIPT_ADMIN_EMAIL?.trim();
  const adminMail =
    adminEmail && adminEmail.toLowerCase() !== input.order.landlord.email.toLowerCase()
      ? await sendMail({
          to: adminEmail,
          subject: `Kopi kvittering ${receipt.receiptNumber}`,
          html,
        })
      : { sent: false as const, reason: "not_configured" as const };

  await prisma.receipt.update({
    where: { id: receipt.id },
    data: {
      sentToLandlordAt: landlordMail.sent ? new Date() : receipt.sentToLandlordAt,
      sentToAdminAt: adminMail.sent ? new Date() : receipt.sentToAdminAt,
    },
  });

  return {
    receipt,
    deliveries: {
      landlord: landlordMail,
      admin: adminMail,
    },
    downloadUrl: `/api/orders/${input.order.id}/receipt/pdf`,
  };
}
