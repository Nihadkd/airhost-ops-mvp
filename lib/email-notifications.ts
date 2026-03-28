import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";

type Recipient = {
  email?: string | null;
  name?: string | null;
};

function resolveBaseUrl() {
  return env.APP_BASE_URL ?? env.NEXTAUTH_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "https://nextjs-saas-v1.vercel.app");
}

function orderUrl(orderId: string) {
  return `${resolveBaseUrl()}/orders/${orderId}`;
}

async function sendEventMail(input: {
  to: Recipient;
  subject: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const to = input.to.email?.trim().toLowerCase();
  if (!to) return { sent: false as const, reason: "missing_recipient" as const };

  const recipientName = (input.to.name?.trim() || "bruker").replace(/[<>&]/g, "");
  const html = `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${input.subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#ffffff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:#0f766e;color:#ffffff;font-size:20px;font-weight:700;">ServNest</td>
          </tr>
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0 0 10px;font-size:14px;color:#334155;">Hei ${recipientName},</p>
              <h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#0f172a;">${input.title}</h1>
              <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">${input.body}</p>
              <a href="${input.ctaUrl}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:600;">${input.ctaLabel}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
              ServNest · Org.nr 937249721 · Servn3st@gmail.com · +47 973 91 486
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendMail({ to, subject: input.subject, html });
}

export async function sendOrderCreatedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  address: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Nytt oppdrag opprettet (#${input.orderNumber})`,
    title: "Nytt oppdrag er opprettet",
    body: `Oppdrag #${input.orderNumber} på ${input.address} er nå registrert i ServNest.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendOrderAssignedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  address: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Nytt oppdrag tildelt (#${input.orderNumber})`,
    title: "Du har fått et nytt oppdrag",
    body: `Oppdrag #${input.orderNumber} på ${input.address} er tildelt deg.`,
    ctaLabel: "Se oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendOrderClaimedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  workerName: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Oppdrag tatt (#${input.orderNumber})`,
    title: "Oppdraget ditt er tatt",
    body: `${input.workerName} har tatt oppdrag #${input.orderNumber}.`,
    ctaLabel: "Følg oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendOrderCompletedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Oppdrag utført - klart for betaling (#${input.orderNumber})`,
    title: "Oppdraget er utført og klart for betaling",
    body: `Oppdrag #${input.orderNumber} er nå utført. Gå inn i oppdraget for å bekrefte og fullføre betaling.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendPaymentReminderEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Betalingspåminnelse (#${input.orderNumber})`,
    title: "Påminnelse om betaling",
    body: `Oppdrag #${input.orderNumber} er utført og venter på betaling. Gå inn i oppdraget for å betale nå.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendPaymentCreatedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Betaling opprettet (#${input.orderNumber})`,
    title: "Betaling er opprettet",
    body: `Betaling for oppdrag #${input.orderNumber} er opprettet. Gaa inn i oppdraget for aa fullfoere betalingen.`,
    ctaLabel: "Aapne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendOrderMessageEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  senderName: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Ny melding om oppdrag #${input.orderNumber}`,
    title: "Du har mottatt en ny melding",
    body: `${input.senderName} har sendt deg en ny melding om oppdrag #${input.orderNumber}.`,
    ctaLabel: "Apne samtalen",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendDirectContactEmail(input: {
  to: Recipient;
  fromName: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: "Ny melding i ServNest",
    title: "Du har mottatt en ny melding",
    body: `${input.fromName} har sendt deg en ny melding i ServNest.`,
    ctaLabel: "Apne meldinger",
    ctaUrl: `${resolveBaseUrl()}/messages`,
  });
}

export async function sendPaymentConfirmedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Betaling mottatt (#${input.orderNumber})`,
    title: "Betaling er registrert",
    body: `Betaling for oppdrag #${input.orderNumber} er registrert i ServNest.`,
    ctaLabel: "Apne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendAssignmentOfferedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  address: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Oppdrag venter på din godkjenning (#${input.orderNumber})`,
    title: "Du har fått et oppdrag til vurdering",
    body: `Oppdrag #${input.orderNumber} på ${input.address} er tildelt deg. Åpne oppdraget og godkjenn eller avbryt.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendWorkerAcceptedAssignmentEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  workerName: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Godkjenn tjenesteutfører for oppdrag #${input.orderNumber}`,
    title: "Tjenesteutfører venter på godkjenning",
    body: `${input.workerName} har bekreftet at vedkommende vil utføre oppdrag #${input.orderNumber}. Du må godkjenne tjenesteutføreren før oppdraget kan starte.`,
    ctaLabel: "Godkjenn oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendAssignmentAcceptedByWorkerEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
  workerName: string;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Tjenesteutfører har godtatt oppdrag #${input.orderNumber}`,
    title: "Oppdraget er bekreftet",
    body: `${input.workerName} har godtatt oppdrag #${input.orderNumber}. Oppdraget er nå bekreftet og klart for videre oppfølging.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendAssignmentConfirmedEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Oppdrag bekreftet (#${input.orderNumber})`,
    title: "Oppdraget er godkjent",
    body: `Du er nå godkjent som tjenesteutfører for oppdrag #${input.orderNumber}.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}

export async function sendAssignmentCancelledEmail(input: {
  to: Recipient;
  orderId: string;
  orderNumber: number;
}) {
  return sendEventMail({
    to: input.to,
    subject: `Tildeling avbrutt (#${input.orderNumber})`,
    title: "Tildelingen er avbrutt",
    body: `Tildelingen for oppdrag #${input.orderNumber} er avbrutt.`,
    ctaLabel: "Åpne oppdrag",
    ctaUrl: orderUrl(input.orderId),
  });
}
