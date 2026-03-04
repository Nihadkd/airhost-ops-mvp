import { ServiceType } from "@prisma/client";

export type OrderPaymentStatus = "not_started" | "pending" | "paid";

export function buildStubPaymentIntentId(orderId: string, amountNok: number) {
  return `pi_${orderId}_${amountNok}`;
}

export function parseStubPaymentIntentAmount(paymentIntent: string | null | undefined) {
  if (!paymentIntent) return null;
  const match = /^pi_[^_]+_(\d+)$/.exec(paymentIntent);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

export function estimatePaymentAmountNok(type: ServiceType, guestCount?: number | null) {
  if (type === "KEY_HANDLING") return 500;
  const guests = guestCount && guestCount > 0 ? guestCount : 1;
  return Math.max(600, guests * 150);
}

export function derivePaymentStatus(input: {
  paymentIntent?: string | null;
  receiptAmountNok?: number | null;
}) {
  if (input.receiptAmountNok && input.receiptAmountNok > 0) return "paid" satisfies OrderPaymentStatus;
  if (input.paymentIntent) return "pending" satisfies OrderPaymentStatus;
  return "not_started" satisfies OrderPaymentStatus;
}
