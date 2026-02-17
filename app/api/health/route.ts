import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ ok: true, service: "airhost-ops", timestamp: new Date().toISOString() });
}