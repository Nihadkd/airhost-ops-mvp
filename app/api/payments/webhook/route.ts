import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hasPaymentsEnabled, env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { apiError, handleApiError } from "@/lib/api";
import { getPaymentProvider } from "@/lib/payments/provider";
import { parseStubPaymentIntentAmount } from "@/lib/payments/order-payment";
import { issueOrderReceipt } from "@/lib/receipt-service";
import { paymentWebhookSchema } from "@/lib/validators";
import { sendPaymentConfirmedEmail } from "@/lib/email-notifications";
import { notifyUserEvent } from "@/lib/user-event-notifications";

type NormalizedWebhookPayload = {
  provider: "stub" | "vipps" | "stripe";
  eventType: "payment_authorized" | "payment_captured" | "payment_failed";
  orderId?: string;
  paymentIntentId?: string;
  amountNok?: number;
  status: "pending" | "paid" | "failed";
};

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(",").map((entry) => entry.trim());
  const timestampPart = parts.find((entry) => entry.startsWith("t="));
  const signaturePart = parts.find((entry) => entry.startsWith("v1="));
  if (!timestampPart || !signaturePart) return false;

  const timestamp = timestampPart.slice(2);
  const signature = signaturePart.slice(3);
  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function normalizeStripeEvent(rawBody: string): NormalizedWebhookPayload {
  const parsed = JSON.parse(rawBody) as {
    type?: string;
    data?: { object?: Record<string, unknown> };
  };

  const eventType = String(parsed?.type ?? "");
  const object = parsed?.data?.object ?? {};
  const metadata =
    typeof object.metadata === "object" && object.metadata !== null
      ? (object.metadata as Record<string, unknown>)
      : null;
  const orderId =
    metadata && typeof metadata.orderId === "string"
      ? metadata.orderId
      : typeof object.client_reference_id === "string"
        ? object.client_reference_id
        : undefined;
  const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : undefined;
  const amountTotal = typeof object.amount_total === "number" ? object.amount_total : undefined;
  const amountNok = typeof amountTotal === "number" ? Math.floor(amountTotal / 100) : undefined;

  if (eventType === "checkout.session.completed" || eventType === "checkout.session.async_payment_succeeded") {
    return {
      provider: "stripe",
      eventType: "payment_captured",
      orderId,
      paymentIntentId,
      amountNok,
      status: "paid",
    };
  }

  if (eventType === "checkout.session.expired" || eventType === "payment_intent.payment_failed") {
    return {
      provider: "stripe",
      eventType: "payment_failed",
      orderId,
      paymentIntentId,
      amountNok,
      status: "failed",
    };
  }

  return {
    provider: "stripe",
    eventType: "payment_authorized",
    orderId,
    paymentIntentId,
    amountNok,
    status: "pending",
  };
}

export async function POST(req: Request) {
  try {
    const configuredProvider = getPaymentProvider();

    let payload: NormalizedWebhookPayload;

    if (configuredProvider === "stripe") {
      const stripeSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
      if (!stripeSecret) return apiError(500, "Stripe webhook secret is not configured");

      const signatureHeader = req.headers.get("stripe-signature")?.trim();
      if (!signatureHeader) return apiError(401, "Missing Stripe signature header");

      const rawBody = await req.text();
      if (!verifyStripeSignature(rawBody, signatureHeader, stripeSecret)) {
        return apiError(401, "Invalid Stripe webhook signature");
      }

      payload = normalizeStripeEvent(rawBody);
    } else {
      const secret = env.PAYMENT_WEBHOOK_SECRET?.trim();
      if (secret) {
        const headerSecret = req.headers.get("x-payment-webhook-secret")?.trim();
        if (!headerSecret || headerSecret !== secret) {
          return apiError(401, "Invalid webhook signature");
        }
      }

      const rawBody = (await req.json().catch(() => null)) as unknown;
      const parsed = paymentWebhookSchema.safeParse(rawBody);
      if (!parsed.success) return apiError(400, "Invalid webhook payload");
      payload = parsed.data;
    }

    if (payload.provider !== configuredProvider) {
      return apiError(409, "Webhook provider mismatch");
    }

    if (!hasPaymentsEnabled()) {
      return NextResponse.json({
        ok: true,
        skipped: "payments_disabled",
      });
    }

    if (payload.status !== "paid") {
      return NextResponse.json({
        ok: true,
        ignored: "status_not_paid",
      });
    }

    if (!payload.orderId && !payload.paymentIntentId) {
      return apiError(400, "Webhook must include orderId or paymentIntentId");
    }

    const order = await prisma.serviceOrder.findFirst({
      where: payload.orderId
        ? { id: payload.orderId }
        : payload.paymentIntentId
          ? { paymentIntent: payload.paymentIntentId }
          : undefined,
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        receipt: true,
      },
    });
    if (!order) return apiError(404, "Order not found for webhook");

    const amountNok =
      payload.amountNok ??
      parseStubPaymentIntentAmount(payload.paymentIntentId ?? order.paymentIntent) ??
      order.receipt?.amountNok ??
      0;
    if (!Number.isFinite(amountNok) || amountNok <= 0) {
      return apiError(400, "Webhook amount is missing or invalid");
    }

    if (payload.paymentIntentId && payload.paymentIntentId !== order.paymentIntent) {
      await prisma.serviceOrder.update({
        where: { id: order.id },
        data: { paymentIntent: payload.paymentIntentId },
      });
    }

    if (order.receipt) {
      return NextResponse.json({
        ok: true,
        alreadyProcessed: true,
        receiptId: order.receipt.id,
      });
    }

    const receiptPayload = await issueOrderReceipt({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        type: order.type,
        address: order.address,
        landlord: order.landlord,
      },
      amountNok: Math.floor(amountNok),
      note: "Automatisk registrert fra betalingswebhook",
    });

    if (order.assignedTo?.id) {
      const assignee = order.assignedTo;
      await notifyUserEvent({
        recipient: {
          userId: assignee.id,
          email: assignee.email,
          name: assignee.name,
        },
        message: `Betaling for oppdrag #${order.orderNumber} er registrert.`,
        targetUrl: `/orders/${order.id}`,
        email: () =>
          sendPaymentConfirmedEmail({
            to: { email: assignee.email, name: assignee.name },
            orderId: order.id,
            orderNumber: order.orderNumber,
          }),
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      ...receiptPayload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
