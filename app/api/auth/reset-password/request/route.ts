import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasMailConfiguration } from "@/lib/env";
import { sendPasswordResetEmail } from "@/lib/auth-email";
import { signToken } from "@/lib/secure-token";

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
    const body = (await req.json().catch(() => null)) as { email?: string } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ code: "INVALID_PAYLOAD", error: "Invalid payload" }, { status: 400 });
    }

    if (!hasMailConfiguration()) {
      return NextResponse.json({ code: "MAIL_NOT_CONFIGURED", error: "Email service unavailable" }, { status: 503 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, isActive: true },
    });

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
      await sendPasswordResetEmail({ to: user.email, token });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset_password_request_error", error);
    return NextResponse.json({ code: "RESET_REQUEST_FAILED", error: "Reset request failed" }, { status: 500 });
  }
}
