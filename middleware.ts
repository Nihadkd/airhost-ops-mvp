import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const publicPaths = ["/", "/login", "/register", "/api/auth/register", "/api/health"];

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith("/api/auth"));

  if (!req.auth && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/admin") && req.auth?.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (pathname.startsWith("/api/admin") && req.auth?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
