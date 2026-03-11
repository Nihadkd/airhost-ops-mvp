import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/secure-token";
import { resetPasswordSchema } from "@/lib/validators";

type ResetConfirmToken = {
  type: "reset_password";
  exp: number;
  payload: {
    userId: string;
    email: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { token?: string; password?: string } | null;
    const token = String(body?.token ?? "").trim();
    const password = String(body?.password ?? "");
    const parsed = resetPasswordSchema.safeParse({ email: "placeholder@example.com", password });
    if (!token || !parsed.success) {
      return NextResponse.json({ code: "INVALID_PAYLOAD", error: "Invalid payload" }, { status: 400 });
    }

    const payload = verifyToken<ResetConfirmToken>(token);
    if (!payload || payload.type !== "reset_password") {
      return NextResponse.json({ code: "INVALID_TOKEN", error: "Invalid token" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.payload.userId },
      select: { id: true, email: true, isActive: true },
    });
    if (!user || !user.isActive || user.email.toLowerCase() !== payload.payload.email.toLowerCase()) {
      return NextResponse.json({ code: "USER_NOT_FOUND", error: "User not found" }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("reset_password_confirm_error", error);
    return NextResponse.json({ code: "RESET_FAILED", error: "Password reset failed" }, { status: 500 });
  }
}
