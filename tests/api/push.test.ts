import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    pushDeviceToken: { findMany: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { sendPushToUser } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { GET as getPushStatus } from "@/app/api/users/me/push-status/route";
import { POST as postTestPush } from "@/app/api/users/me/test-push/route";

describe("push diagnostics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1" } } as never);
  });

  it("GET /api/users/me/push-status returns token summary", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      mobileNotifications: true,
      updatedAt: new Date("2026-03-04T10:00:00.000Z"),
    } as never);
    vi.mocked(prisma.pushDeviceToken.findMany).mockResolvedValue([
      {
        token: "ExponentPushToken[abcdefgh1234567890]",
        platform: "android",
        deviceName: "Pixel",
        isActive: true,
        updatedAt: new Date("2026-03-04T10:01:00.000Z"),
        createdAt: new Date("2026-03-04T09:55:00.000Z"),
      },
    ] as never);

    const res = await getPushStatus();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(
      expect.objectContaining({
        mobileNotifications: true,
        activeTokenCount: 1,
      }),
    );
    expect(data.devices[0].tokenPreview).toContain("...");
  });

  it("POST /api/users/me/test-push sends push to signed-in user", async () => {
    vi.mocked(sendPushToUser).mockResolvedValue({
      ok: true,
      tokenCount: 1,
      deadTokenCount: 0,
      errors: [],
    });

    const res = await postTestPush(new Request("http://localhost/api/users/me/test-push", { method: "POST" }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(vi.mocked(sendPushToUser)).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        title: "ServNest testvarsel",
      }),
    );
    expect(data).toEqual(
      expect.objectContaining({
        ok: true,
        delivery: expect.objectContaining({ tokenCount: 1 }),
      }),
    );
  });
});
