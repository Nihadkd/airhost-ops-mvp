import { z } from "zod";

const nonEmpty = z.string().trim().min(1);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: nonEmpty,
  DATABASE_URL_UNPOOLED: nonEmpty.optional(),
  NEXTAUTH_SECRET: nonEmpty.optional(),
  NEXTAUTH_URL: z.string().url().optional(),
  PAYMENTS_ENABLED: z.coerce.boolean().default(false),
  PAYMENT_PROVIDER: z.enum(["stub", "vipps", "stripe"]).default("stub"),
  PAYMENT_WEBHOOK_SECRET: nonEmpty.optional(),
  VIPPS_CLIENT_ID: nonEmpty.optional(),
  VIPPS_CLIENT_SECRET: nonEmpty.optional(),
  VIPPS_SUBSCRIPTION_KEY: nonEmpty.optional(),
  VIPPS_MERCHANT_SERIAL_NUMBER: nonEmpty.optional(),
  STRIPE_SECRET_KEY: nonEmpty.optional(),
  STRIPE_WEBHOOK_SECRET: nonEmpty.optional(),
  RESEND_API_KEY: nonEmpty.optional(),
  RECEIPT_FROM_EMAIL: z.string().email().optional(),
  RECEIPT_ADMIN_EMAIL: z.string().email().optional(),
  APP_BASE_URL: z.string().url().optional(),
  VERCEL_URL: nonEmpty.optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] invalid_environment", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

if (parsed.data.NODE_ENV === "production") {
  const baseUrl =
    parsed.data.APP_BASE_URL ??
    parsed.data.NEXTAUTH_URL ??
    (parsed.data.VERCEL_URL ? `https://${parsed.data.VERCEL_URL}` : undefined);

  const productionChecks = z
    .object({
      DATABASE_URL: nonEmpty,
      NEXTAUTH_SECRET: nonEmpty,
      baseUrl: z.string().url(),
    })
    .safeParse({
      DATABASE_URL: parsed.data.DATABASE_URL,
      NEXTAUTH_SECRET: parsed.data.NEXTAUTH_SECRET,
      baseUrl,
    });

  if (!productionChecks.success) {
    console.error("[env] missing_required_production_environment", productionChecks.error.flatten().fieldErrors);
    throw new Error("Missing required production environment variables");
  }
}

export const env = parsed.data;

export function hasMailConfiguration() {
  return Boolean(env.RESEND_API_KEY && env.RECEIPT_FROM_EMAIL);
}

export function hasPaymentsEnabled() {
  return env.PAYMENTS_ENABLED;
}
