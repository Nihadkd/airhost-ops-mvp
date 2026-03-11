import { describe, expect, it } from "vitest";
import { toUserErrorMessage } from "@/lib/client-error";

describe("toUserErrorMessage", () => {
  const t = (key: string) => `t:${key}`;

  it("returns payload error text for unknown 400 errors", async () => {
    const response = new Response(JSON.stringify({ error: "Missing file/orderId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    const message = await toUserErrorMessage(response, t, "genericError");
    expect(message).toBe("Missing file/orderId");
  });

  it("uses code mapping when code is present", async () => {
    const response = new Response(JSON.stringify({ code: "INVALID_PAYLOAD", error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    const message = await toUserErrorMessage(response, t, "genericError");
    expect(message).toBe("t:registerReasonInvalidPayload");
  });
});
