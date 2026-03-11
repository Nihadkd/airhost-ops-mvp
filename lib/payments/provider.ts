import { env } from "@/lib/env";

export type PaymentIntentInput = {
  orderId: string;
  amountNok: number;
  currency?: string;
};

export type PaymentIntent = {
  provider: "stub" | "vipps" | "stripe";
  id: string;
  status: "pending" | "paid";
  checkoutUrl?: string | null;
};

export function getPaymentProvider() {
  return env.PAYMENT_PROVIDER;
}

export function isVippsConfigured() {
  return Boolean(
    env.VIPPS_CLIENT_ID &&
      env.VIPPS_CLIENT_SECRET &&
      env.VIPPS_SUBSCRIPTION_KEY &&
      env.VIPPS_MERCHANT_SERIAL_NUMBER,
  );
}

export function isStripeConfigured() {
  return Boolean(env.STRIPE_SECRET_KEY);
}

function resolveAppBaseUrl() {
  if (env.APP_BASE_URL) return env.APP_BASE_URL;
  if (env.NEXTAUTH_URL) return env.NEXTAUTH_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return null;
}

async function createStripeCheckoutSession(input: PaymentIntentInput): Promise<PaymentIntent> {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Stripe provider is selected but STRIPE_SECRET_KEY is missing");
  }
  const baseUrl = resolveAppBaseUrl();
  if (!baseUrl) {
    throw new Error("Stripe provider requires APP_BASE_URL, NEXTAUTH_URL, or VERCEL_URL");
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${baseUrl}/orders/${input.orderId}?payment=success`);
  body.set("cancel_url", `${baseUrl}/orders/${input.orderId}?payment=cancelled`);
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", (input.currency ?? "NOK").toLowerCase());
  body.set("line_items[0][price_data][unit_amount]", String(Math.max(1, Math.floor(input.amountNok * 100))));
  body.set("line_items[0][price_data][product_data][name]", `ServNest oppdrag ${input.orderId}`);
  body.set("metadata[orderId]", input.orderId);

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Stripe checkout session failed: ${res.status}${detail ? ` ${detail}` : ""}`);
  }

  const data = (await res.json()) as { id?: string; url?: string | null };
  if (!data.id) {
    throw new Error("Stripe checkout session did not return an id");
  }

  return {
    provider: "stripe",
    id: data.id,
    status: "pending",
    checkoutUrl: data.url ?? null,
  };
}

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
  if (env.NODE_ENV === "production" && input.amountNok <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  if (env.PAYMENT_PROVIDER === "vipps") {
    if (!isVippsConfigured()) {
      throw new Error("Vipps provider is selected but not fully configured");
    }
    // Placeholder while Vipps onboarding is pending.
    return {
      provider: "vipps",
      id: `vipps_pi_${input.orderId}_${input.amountNok}`,
      status: "pending",
      checkoutUrl: null,
    };
  }

  if (env.PAYMENT_PROVIDER === "stripe") {
    return createStripeCheckoutSession(input);
  }

  return {
    provider: "stub",
    id: `pi_${input.orderId}_${input.amountNok}`,
    status: "pending",
    checkoutUrl: null,
  };
}
