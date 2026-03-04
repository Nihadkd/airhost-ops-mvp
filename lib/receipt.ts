import { ServiceType } from "@prisma/client";

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

  return `<!doctype html>
<html lang="no">
<head>
  <meta charset="utf-8" />
  <title>Kvittering ${input.receiptNumber}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
    .card { border: 1px solid #d1d5db; border-radius: 10px; padding: 18px; max-width: 760px; }
    .row { display: flex; justify-content: space-between; gap: 16px; margin: 8px 0; }
    .label { color: #4b5563; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; }
    .value { font-size: 15px; font-weight: 600; }
    h1 { margin: 0 0 14px 0; font-size: 24px; }
    .muted { color: #6b7280; font-size: 12px; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Kvittering</h1>
    <div class="row"><div><div class="label">Kvitteringsnummer</div><div class="value">${input.receiptNumber}</div></div><div><div class="label">Betalt</div><div class="value">${paidAtText}</div></div></div>
    <div class="row"><div><div class="label">Mottaker</div><div class="value">${input.recipientName}</div></div><div><div class="label">E-post</div><div class="value">${input.recipientEmail}</div></div></div>
    <div class="row"><div><div class="label">Oppdrag</div><div class="value">#${input.orderNumber} - ${input.orderType}</div></div><div><div class="label">Belop</div><div class="value">${amountText}</div></div></div>
    <div class="row"><div><div class="label">Adresse</div><div class="value">${input.address}</div></div></div>
    ${note ? `<div class="row"><div><div class="label">Notat</div><div class="value">${note}</div></div></div>` : ""}
    <p class="muted">ServNest · Automatisk generert kvittering</p>
  </div>
</body>
</html>`;
}
