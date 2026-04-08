import { ProfileMode, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTrustedOrigin } from "@/lib/request-security";
import { verifyToken } from "@/lib/secure-token";

type RegisterVerifyToken = {
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

    const body = (await req.json().catch(() => null)) as { token?: string } | null;
    const token = body?.token?.trim();
    if (!token) {
      return NextResponse.json({ code: "INVALID_TOKEN", error: "Invalid token" }, { status: 400 });
    }

    const payload = verifyToken<RegisterVerifyToken>(token);
    if (!payload || payload.type !== "register") {
      return NextResponse.json({ code: "INVALID_TOKEN", error: "Invalid token" }, { status: 400 });
    }

    const normalizedEmail = payload.payload.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ code: "EMAIL_EXISTS", error: "Email already exists" }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: payload.payload.name,
        email: normalizedEmail,
        phone: payload.payload.phone,
        password: payload.payload.password,
        ...payload.payload.profile,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("register_verify_error", error);
    return NextResponse.json({ code: "REGISTER_VERIFY_FAILED", error: "Verification failed" }, { status: 500 });
  }
}
