import { prisma } from "@/lib/prisma";

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null>;
};

export type PushDeliveryResult = {
  ok: boolean;
  reason?:
    | "user_not_found"
    | "mobile_notifications_disabled"
    | "no_active_tokens"
    | "expo_send_failed"
    | "unexpected_error";
  tokenCount: number;
  deadTokenCount: number;
  errors: string[];
};

type ExpoPushResult = {
  status?: "ok" | "error";
  details?: { error?: string };
};

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<PushDeliveryResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { mobileNotifications: true },
    });
    if (!user) {
      console.warn("[push] user_not_found", { userId });
      return { ok: false, reason: "user_not_found", tokenCount: 0, deadTokenCount: 0, errors: [] };
    }
    if (!user.mobileNotifications) {
      console.info("[push] skipped_mobile_notifications_disabled", { userId });
      return { ok: false, reason: "mobile_notifications_disabled", tokenCount: 0, deadTokenCount: 0, errors: [] };
    }

    const tokens = await prisma.pushDeviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true },
      take: 20,
    });
    if (!tokens.length) {
      console.warn("[push] no_active_tokens", { userId });
      return { ok: false, reason: "no_active_tokens", tokenCount: 0, deadTokenCount: 0, errors: [] };
    }

    const data = { ...(payload.data ?? {}) };
    if (!data.path && typeof data.orderId === "string" && data.orderId.length > 0) {
      data.path = `/orders/${data.orderId}`;
    }

    const messages = tokens.map((item) => ({
      to: item.token,
      sound: "default",
      channelId: "default",
      priority: "high" as const,
      title: payload.title,
      body: payload.body,
      data,
    }));

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      console.error("[push] expo_send_failed", { status: res.status, userId, tokenCount: tokens.length });
      return {
        ok: false,
        reason: "expo_send_failed",
        tokenCount: tokens.length,
        deadTokenCount: 0,
        errors: [`http_${res.status}`],
      };
    }
    const body = (await res.json().catch(() => null)) as { data?: ExpoPushResult[] } | null;
    const rows = body?.data ?? [];
    if (!rows.length) {
      console.info("[push] expo_sent", { userId, tokenCount: tokens.length, hasDataPath: Boolean(data.path) });
      return { ok: true, tokenCount: tokens.length, deadTokenCount: 0, errors: [] };
    }

    const deadTokens: string[] = [];
    const otherErrors: string[] = [];
    rows.forEach((row, idx) => {
      if (row.status === "error" && row.details?.error === "DeviceNotRegistered") {
        const token = tokens[idx]?.token;
        if (token) deadTokens.push(token);
      } else if (row.status === "error" && row.details?.error) {
        otherErrors.push(row.details.error);
      }
    });

    if (deadTokens.length) {
      await prisma.pushDeviceToken.updateMany({
        where: { token: { in: deadTokens } },
        data: { isActive: false },
      });
    }
    if (otherErrors.length) {
      console.error("[push] expo_delivery_errors", {
        userId,
        errors: Array.from(new Set(otherErrors)),
      });
    }
    console.info("[push] expo_sent", { userId, tokenCount: tokens.length, hasDataPath: Boolean(data.path) });
    return {
      ok: otherErrors.length === 0,
      tokenCount: tokens.length,
      deadTokenCount: deadTokens.length,
      errors: Array.from(new Set(otherErrors)),
    };
  } catch (error) {
    console.error("[push] unexpected_error", error);
    // Never break API request flow because of push failures.
    return {
      ok: false,
      reason: "unexpected_error",
      tokenCount: 0,
      deadTokenCount: 0,
      errors: [error instanceof Error ? error.message : "unknown_error"],
    };
  }
}
