import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/", "/login", "/register", "/api/auth/register", "/api/health"];

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth"));
  const token =
    (await getToken({ req, secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET })) ??
    (await getToken({ req, secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET }));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && token?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/api/admin") && token?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
