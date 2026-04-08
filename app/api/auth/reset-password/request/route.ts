import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env, hasMailConfiguration } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { signToken } from "@/lib/secure-token";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp, requireTrustedOrigin } from "@/lib/request-security";

type ResetRequestPayload = {
  type: "reset_password";
  exp: number;
  payload: {
    userId: string;
    email: string;
  };
};

export async function POST(req: Request) {
  try {
    const originError = requireTrustedOrigin(req);
    if (originError) {
      return originError;
    }

    const rateLimitError = enforceRateLimit({
      key: `reset-password:${getClientIp(req)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      code: "RESET_RATE_LIMITED",
      message: "Too many password reset attempts. Please wait and try again.",
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ code: "INVALID_PAYLOAD", error: "Invalid payload" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, isActive: true },
    });

    let debugResetUrl: string | null = null;
    if (user && user.isActive) {
      const tokenPayload: ResetRequestPayload = {
        type: "reset_password",
        exp: Date.now() + 1000 * 60 * 30,
        payload: {
          userId: user.id,
          email: user.email,
        },
      };
      const token = signToken(tokenPayload);
      if (hasMailConfiguration()) {
        await sendPasswordResetEmail({ to: user.email, token });
      } else if (env.NODE_ENV !== "production") {
        const baseUrl =
          env.APP_BASE_URL ?? env.NEXTAUTH_URL ?? (env.VERCEL_URL ? `https://${env.VERCEL_URL}` : "http://localhost:3000");
        debugResetUrl = `${baseUrl}/forgot-password?token=${encodeURIComponent(token)}`;
        console.info("password_reset_debug_url", { email: user.email, debugResetUrl });
      } else {
        return NextResponse.json({ code: "MAIL_NOT_CONFIGURED", error: "Email service unavailable" }, { status: 503 });
      }
    }

    return NextResponse.json({ success: true, debugResetUrl });
  } catch (error) {
    console.error("reset_password_request_error", error);
    return NextResponse.json({ code: "RESET_REQUEST_FAILED", error: "Reset request failed" }, { status: 500 });
  }
}
