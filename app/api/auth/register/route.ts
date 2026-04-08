import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma, ProfileMode, Role } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { hasMailConfiguration } from "@/lib/env";
import { signToken } from "@/lib/secure-token";
import { sendRegistrationVerificationEmail } from "@/lib/auth-email";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getClientIp, requireTrustedOrigin } from "@/lib/request-security";

type RegisterVerifyPayload = {
  type: "register";
  exp: number;
  payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    profile: {
      role: Role;
      canLandlord: boolean;
      canService: boolean;
      activeMode: ProfileMode;
    };
  };
};

export async function POST(req: Request) {
  try {
    const originError = requireTrustedOrigin(req);
    if (originError) {
      return originError;
    }

    const rateLimitError = enforceRateLimit({
      key: `register:${getClientIp(req)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
      code: "REGISTER_RATE_LIMITED",
      message: "Too many registration attempts. Please wait and try again.",
    });
    if (rateLimitError) {
      return rateLimitError;
    }

    if (!hasMailConfiguration()) {
      return NextResponse.json({ code: "MAIL_NOT_CONFIGURED", error: "Email service unavailable" }, { status: 503 });
    }

    const body = await req.json();
    const data = registerSchema.parse(body);
    const normalizedEmail = data.email.trim().toLowerCase();

    const exists = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });
    if (exists) {
      return NextResponse.json({ code: "EMAIL_EXISTS", error: "Email already exists" }, { status: 409 });
    }

    const password = await bcrypt.hash(data.password, 10);
    const selectedRole = data.role ?? "BEGGE";
    const profile =
      selectedRole === "TJENESTE"
        ? { role: Role.TJENESTE, canLandlord: false, canService: true, activeMode: ProfileMode.TJENESTE }
        : selectedRole === "BEGGE"
          ? { role: Role.UTLEIER, canLandlord: true, canService: true, activeMode: ProfileMode.UTLEIER }
          : { role: Role.UTLEIER, canLandlord: true, canService: false, activeMode: ProfileMode.UTLEIER };

    const tokenPayload: RegisterVerifyPayload = {
      type: "register",
      exp: Date.now() + 1000 * 60 * 60 * 24,
      payload: {
        name: data.name.trim(),
        email: normalizedEmail,
        phone: data.phone.trim(),
        password,
        profile,
      },
    };

    const token = signToken(tokenPayload);
    const mail = await sendRegistrationVerificationEmail({ to: normalizedEmail, token });
    if (!mail.sent) {
      return NextResponse.json({ code: "MAIL_SEND_FAILED", error: "Could not send verification email" }, { status: 503 });
    }

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ code: "INVALID_PAYLOAD", error: "Invalid payload" }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ code: "EMAIL_EXISTS", error: "Email already exists" }, { status: 409 });
    }

    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error &&
        (error.message.includes("Unable to open the database file") ||
          error.message.includes("Can't reach database server")))
    ) {
      console.error("register_error", error instanceof Error ? error.message : "Database unavailable");
      return NextResponse.json(
        { code: "DB_UNAVAILABLE", error: "Registration is unavailable because database is not reachable" },
        { status: 503 },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("register_error", message);
    return NextResponse.json({ code: "REGISTER_FAILED", error: "Registration failed" }, { status: 500 });
  }
}
