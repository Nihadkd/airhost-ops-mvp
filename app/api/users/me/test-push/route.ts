import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/rbac";
import { handleApiError } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";

export async function POST() {
  try {
    const session = await requireAuth();
    const result = await sendPushToUser(session.user.id, {
      title: "ServNest testvarsel",
      body: "Dette er en test av lyd og push-varsler.",
      data: { type: "push_test", path: "/settings" },
    });

    return NextResponse.json({
      ok: result.ok,
      delivery: result,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
