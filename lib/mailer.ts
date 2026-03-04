type MailInput = {
  to: string;
  subject: string;
  html: string;
};

export type MailResult =
  | { sent: true; provider: "resend" }
  | { sent: false; reason: "not_configured" | "provider_error" };

export async function sendMail(input: MailInput): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RECEIPT_FROM_EMAIL?.trim();

  if (!apiKey || !from) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });

    if (!res.ok) {
      console.error("[mail] resend_failed", { status: res.status });
      return { sent: false, reason: "provider_error" };
    }

    return { sent: true, provider: "resend" };
  } catch (error) {
    console.error("[mail] resend_unexpected_error", error);
    return { sent: false, reason: "provider_error" };
  }
}
