import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    NODE_ENV: "production",
    APP_BASE_URL: "https://wrong.example",
    NEXTAUTH_URL: undefined,
    VERCEL_URL: undefined,
  },
}));

vi.mock("@/lib/env", () => ({
  env: mockEnv,
}));

import { ApiRouteError } from "@/lib/api";
import { assertTrustedOrigin, getTrustedOrigins, requireTrustedOrigin } from "@/lib/request-security";

const defaultEnv = {
  NODE_ENV: "production",
  APP_BASE_URL: "https://wrong.example",
  NEXTAUTH_URL: undefined,
  VERCEL_URL: undefined,
};

describe("request origin security", () => {
  beforeEach(() => {
    Object.assign(mockEnv, defaultEnv);
  });

  it("trusts the forwarded live host in production", () => {
    const request = new Request("https://nextjs-saas-v1.vercel.app/api/orders/o1/assignment/accept", {
      method: "PUT",
      headers: {
        Origin: "https://servnest.no",
        "x-forwarded-host": "servnest.no",
        "x-forwarded-proto": "https",
      },
    });

    expect(getTrustedOrigins(request)).toEqual(
      new Set(["https://wrong.example", "https://nextjs-saas-v1.vercel.app", "https://servnest.no"]),
    );
    expect(() => assertTrustedOrigin(request)).not.toThrow();
  });

  it("accepts same-origin referer when origin header is missing", async () => {
    const request = new Request("https://servnest.no/api/orders/o1/assignment/accept", {
      method: "PUT",
      headers: {
        Referer: "https://servnest.no/orders/o1",
      },
    });

    expect(() => assertTrustedOrigin(request)).not.toThrow();
    expect(requireTrustedOrigin(request)).toBeNull();
  });

  it("rejects referer from a different origin", async () => {
    const request = new Request("https://servnest.no/api/orders/o1/assignment/accept", {
      method: "PUT",
      headers: {
        Referer: "https://evil.example/orders/o1",
      },
    });

    try {
      assertTrustedOrigin(request);
      throw new Error("Expected assertTrustedOrigin to reject an untrusted referer");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRouteError);
      expect(error).toMatchObject({
        status: 403,
        code: "UNTRUSTED_ORIGIN",
      });
    }
  });
});
