import { ServiceType } from "@prisma/client";

const BUSINESS_NAME = "ServNest";
const BUSINESS_EMAIL = "Servn3st@gmail.com";
const BUSINESS_PHONE = "+47 973 91 486";
const BUSINESS_ORG_NUMBER = "937249721";

export function estimateOrderAmountNok(type: ServiceType) {
  if (type === "KEY_HANDLING") return 500;
  return 600;
}

export function formatNok(amountNok: number) {
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency: "NOK",
    maximumFractionDigits: 0,
  }).format(amountNok);
}

export function createReceiptNumber(orderNumber: number, paidAt: Date) {
  const y = paidAt.getFullYear();
  const m = String(paidAt.getMonth() + 1).padStart(2, "0");
  const d = String(paidAt.getDate()).padStart(2, "0");
  return `SN-${y}${m}${d}-${String(orderNumber).padStart(5, "0")}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildReceiptHtml(input: {
  receiptNumber: string;
  paidAt: Date;
  amountNok: number;
  recipientName: string;
  recipientEmail: string;
  orderNumber: number;
  orderType: string;
  address: string;
  note?: string | null;
}) {
  const paidAtText = new Date(input.paidAt).toLocaleString("nb-NO", { hour12: false });
  const amountText = formatNok(input.amountNok);
  const note = input.note?.trim();
  const safeReceiptNumber = escapeHtml(input.receiptNumber);
  const safeRecipientName = escapeHtml(input.recipientName);
  const safeRecipientEmail = escapeHtml(input.recipientEmail);
  const safeOrderType = escapeHtml(input.orderType);
  const safeAddress = escapeHtml(input.address);
  const safeNote = note ? escapeHtml(note) : "";
  const safeBusinessName = escapeHtml(BUSINESS_NAME);
  const safeBusinessEmail = escapeHtml(BUSINESS_EMAIL);
  const safeBusinessPhone = escapeHtml(BUSINESS_PHONE);

  return `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>Kvittering ${safeReceiptNumber}</title>
  <style>
    :root {
      --text: #0f172a;
      --muted: #475569;
      --line: #d1d5db;
      --surface: #ffffff;
      --soft: #f8fafc;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      color: var(--text);
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }
    .card {
      max-width: 840px;
      margin: 0 auto;
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
      background: var(--soft);
    }
    .title {
      margin: 0;
      font-size: 26px;
      line-height: 1.2;
      letter-spacing: 0.01em;
    }
    .brand {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .company {
      text-align: right;
      font-size: 13px;
      color: var(--muted);
      min-width: 260px;
    }
    .company strong {
      display: block;
      color: var(--text);
      font-size: 15px;
      margin-bottom: 3px;
    }
    .section {
      padding: 20px 24px;
      border-bottom: 1px solid var(--line);
    }
    .section:last-of-type {
      border-bottom: 0;
    }
    .section-title {
      margin: 0 0 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--muted);
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 18px;
    }
    .meta-item .label {
      display: block;
      font-size: 11px;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 2px;
    }
    .meta-item .value {
      display: block;
      font-size: 15px;
      font-weight: 600;
      color: var(--text);
      word-break: break-word;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    th, td {
      padding: 12px 14px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      background: #f8fafc;
      width: 28%;
    }
    tr:last-child td, tr:last-child th {
      border-bottom: 0;
    }
    .total-row th,
    .total-row td {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      background: #ecfeff;
    }
    .total-row td strong {
      font-size: 30px;
      line-height: 1.1;
      font-weight: 800;
      letter-spacing: 0.01em;
      color: #0f172a;
      display: inline-block;
    }
    .business-box {
      margin-top: 14px;
      padding: 12px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      background: #f8fafc;
      color: #0f172a;
    }
    .business-box-title {
      margin: 0 0 6px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      font-weight: 700;
    }
    .note {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid #bae6fd;
      border-radius: 10px;
      background: #f0f9ff;
      color: #0f172a;
    }
    .footer {
      padding: 14px 24px 18px;
      color: var(--muted);
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
      border-top: 1px solid var(--line);
      background: #fcfcfd;
    }
    .pill {
      display: inline-block;
      margin-left: 8px;
      padding: 1px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #134e4a;
      background: #ccfbf1;
      border: 1px solid #99f6e4;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .card {
        max-width: none;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <h1 class="title">Kvittering</h1>
        <p class="brand">Automatisk generert betalingskvittering <span class="pill">Betalt</span></p>
      </div>
      <div class="company">
        <strong>${safeBusinessName}</strong>
        <div>Org.nr: ${BUSINESS_ORG_NUMBER}</div>
        <div>${safeBusinessEmail}</div>
        <div>${safeBusinessPhone}</div>
      </div>
    </div>

    <section class="section">
      <h2 class="section-title">Kvitteringsinformasjon</h2>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="label">Kvitteringsnummer</span>
          <span class="value">${safeReceiptNumber}</span>
        </div>
        <div class="meta-item">
          <span class="label">Betalt dato</span>
          <span class="value">${paidAtText}</span>
        </div>
        <div class="meta-item">
          <span class="label">Mottaker</span>
          <span class="value">${safeRecipientName}</span>
        </div>
        <div class="meta-item">
          <span class="label">E-post</span>
          <span class="value">${safeRecipientEmail}</span>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">Oppdragsdetaljer</h2>
      <table>
        <tbody>
          <tr>
            <th>Oppdrag</th>
            <td>#${input.orderNumber} - ${safeOrderType}</td>
          </tr>
          <tr>
            <th>Adresse</th>
            <td>${safeAddress}</td>
          </tr>
          <tr class="total-row">
            <th>Totalsum</th>
            <td><strong>${amountText}</strong></td>
          </tr>
        </tbody>
      </table>
      <div class="business-box">
        <p class="business-box-title">Bedriftsinformasjon</p>
        <div><strong>${safeBusinessName}</strong></div>
        <div>Org.nr: ${BUSINESS_ORG_NUMBER}</div>
        <div>E-post: ${safeBusinessEmail}</div>
        <div>Telefon: ${safeBusinessPhone}</div>
      </div>
      ${note ? `<div class="note"><strong>Notat:</strong> ${safeNote}</div>` : ""}
    </section>

    <div class="footer">
      <div>${safeBusinessName} · Org.nr ${BUSINESS_ORG_NUMBER}</div>
      <div>Denne kvitteringen er gyldig uten signatur.</div>
    </div>
  </div>
</body>
</html>`;
}
