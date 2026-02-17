import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep middleware minimal in production to avoid edge auth drift.
// Access control is enforced in server layouts and API route handlers.
export default function middleware(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
