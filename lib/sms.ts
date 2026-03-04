type SmsSendResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "missing_phone" | "invalid_phone" | "provider_error" };

function normalizePhoneNumber(phone: string) {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("+")) {
    return /^\+\d{8,15}$/.test(trimmed) ? trimmed : null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (/^\d{8}$/.test(digits)) {
    return `+47${digits}`;
  }
  if (/^\d{9,15}$/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

export async function sendSms(toPhone: string | null | undefined, body: string): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromPhone = process.env.TWILIO_FROM_PHONE?.trim();

  if (!accountSid || !authToken || !fromPhone) {
    return { sent: false, reason: "not_configured" };
  }
  if (!toPhone) {
    return { sent: false, reason: "missing_phone" };
  }

  const normalizedTo = normalizePhoneNumber(toPhone);
  const normalizedFrom = normalizePhoneNumber(fromPhone);
  if (!normalizedTo || !normalizedFrom) {
    return { sent: false, reason: "invalid_phone" };
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const payload = new URLSearchParams({
    To: normalizedTo,
    From: normalizedFrom,
    Body: body,
  });

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload,
    });

    if (!res.ok) {
      console.error("[sms] twilio_send_failed", { status: res.status });
      return { sent: false, reason: "provider_error" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[sms] unexpected_error", error);
    return { sent: false, reason: "provider_error" };
  }
}

export async function sendAssignedOrderSms(args: {
  workerPhone: string | null | undefined;
  orderId: string;
  address: string;
  date: Date;
}) {
  const when = new Date(args.date).toLocaleString("nb-NO", { hour12: false });
  const message =
    `ServNest: Du har faatt nytt oppdrag #${args.orderId}. ` +
    `Adresse: ${args.address}. Tid: ${when}. Aapne appen for detaljer.`;
  return sendSms(args.workerPhone, message);
}
