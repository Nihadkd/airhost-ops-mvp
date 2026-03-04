import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetPasswordSchema.parse(body);
    const email = parsed.email.trim().toLowerCase();

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: email,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user) {
      return NextResponse.json({ code: "USER_NOT_FOUND", error: "User not found" }, { status: 404 });
    }

    if (!user.isActive) {
      return NextResponse.json({ code: "USER_INACTIVE", error: "User is inactive" }, { status: 403 });
    }

    const passwordHash = await bcrypt.hash(parsed.password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ code: "INVALID_PAYLOAD", error: "Invalid payload" }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("reset_password_error", message);
    return NextResponse.json({ code: "RESET_FAILED", error: "Password reset failed" }, { status: 500 });
  }
}
