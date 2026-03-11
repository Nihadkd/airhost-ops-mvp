import { env } from "@/lib/env";
import { sendMail } from "@/lib/mailer";

function baseUrl() {
  return env.APP_BASE_URL ?? env.NEXTAUTH_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
}

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
}) {
  const html = `<!doctype html>
<html lang="no">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${input.subject}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;background:#fff;border:1px solid #dbe2ea;border-radius:14px;overflow:hidden;">
        <tr><td style="padding:20px 24px;background:#0f766e;color:#fff;font-size:20px;font-weight:700;">ServNest</td></tr>
        <tr><td style="padding:20px 24px;">
          <h1 style="margin:0 0 10px;font-size:22px;color:#0f172a;">${input.title}</h1>
          <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#334155;">${input.description}</p>
          <a href="${input.actionUrl}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;">${input.actionLabel}</a>
          <p style="margin:14px 0 0;font-size:12px;color:#64748b;">Hvis knappen ikke fungerer, bruk denne lenken:<br/>${input.actionUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  return sendMail({ to: input.to, subject: input.subject, html });
}

export async function sendRegistrationVerificationEmail(args: { to: string; token: string }) {
  const url = `${baseUrl()}/register/verify?token=${encodeURIComponent(args.token)}`;
  return sendAuthEmail({
    to: args.to,
    subject: "Bekreft e-post for ServNest",
    title: "Bekreft kontoen din",
    description: "Trykk på knappen under for å aktivere kontoen din i ServNest.",
    actionLabel: "Bekreft e-post",
    actionUrl: url,
  });
}

export async function sendPasswordResetEmail(args: { to: string; token: string }) {
  const url = `${baseUrl()}/forgot-password?token=${encodeURIComponent(args.token)}`;
  return sendAuthEmail({
    to: args.to,
    subject: "Tilbakestill passord i ServNest",
    title: "Tilbakestill passord",
    description: "Vi mottok en forespørsel om nytt passord. Trykk på knappen for å fortsette.",
    actionLabel: "Bytt passord",
    actionUrl: url,
  });
}
