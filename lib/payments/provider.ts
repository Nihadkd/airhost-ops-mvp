export type PaymentIntentInput = {
  orderId: string;
  amountNok: number;
  currency?: string;
};

export type PaymentIntent = {
  provider: "stub";
  id: string;
  status: "pending" | "paid";
};

export async function createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent> {
  return {
    provider: "stub",
    id: `pi_${input.orderId}`,
    status: "pending",
  };
}