import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma, ProfileMode, Role } from "@prisma/client";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return NextResponse.json({ code: "EMAIL_EXISTS", error: "Email already exists" }, { status: 409 });
    }

    const password = await bcrypt.hash(data.password, 10);

    const profile =
      data.role === "TJENESTE"
        ? { role: Role.TJENESTE, canLandlord: false, canService: true, activeMode: ProfileMode.TJENESTE }
        : data.role === "BEGGE"
          ? { role: Role.UTLEIER, canLandlord: true, canService: true, activeMode: ProfileMode.UTLEIER }
          : { role: Role.UTLEIER, canLandlord: true, canService: false, activeMode: ProfileMode.UTLEIER };

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password,
        ...profile,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        canLandlord: true,
        canService: true,
        activeMode: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
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
