import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { ProfileMode, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = registerSchema.parse(body);

    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
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
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}