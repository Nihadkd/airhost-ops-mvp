import { describe, expect, it } from "vitest";
import { buildReceiptHtml } from "@/lib/receipt";

describe("buildReceiptHtml", () => {
  it("includes business org number and contact details", () => {
    const html = buildReceiptHtml({
      receiptNumber: "SN-20260305-00010",
      paidAt: new Date("2026-03-05T12:00:00.000Z"),
      amountNok: 850,
      recipientName: "Test User",
      recipientEmail: "test@example.com",
      orderNumber: 10,
      orderType: "CLEANING",
      address: "Testveien 1",
      note: null,
    });

    expect(html).toContain("Org.nr: 937249721");
    expect(html).toContain("Servn3st@gmail.com");
    expect(html).toContain("+47 973 91 486");
    expect(html).toContain("Bedriftsinformasjon");
    expect(html).toContain("<td><strong>");
  });
});
