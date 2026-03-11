import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

type BasePayload = {
  type: string;
  exp: number;
};

function getSecret() {
  return (env.NEXTAUTH_SECRET || "dev-auth-secret").trim();
}

function base64url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

function signPart(part: string) {
  return createHmac("sha256", getSecret()).update(part).digest("base64url");
}

export function signToken<T extends BasePayload>(payload: T) {
  const part = base64url(JSON.stringify(payload));
  const signature = signPart(part);
  return `${part}.${signature}`;
}

export function verifyToken<T extends BasePayload>(token: string): T | null {
  if (!token || typeof token !== "string") return null;
  const [part, signature] = token.split(".");
  if (!part || !signature) return null;

  const expected = signPart(part);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const decoded = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as T;
    if (!decoded?.exp || Date.now() > decoded.exp) return null;
    return decoded;
  } catch {
    return null;
  }
}
