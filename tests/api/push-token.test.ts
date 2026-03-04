import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    pushDeviceToken: { upsert: vi.fn(), updateMany: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DELETE, POST } from "@/app/api/users/me/push-token/route";

describe("/api/users/me/push-token", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers token for authenticated user", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.pushDeviceToken.upsert).mockResolvedValue({ id: "p1", token: "ExponentPushToken[test]" } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "ExponentPushToken[test]", platform: "android", deviceName: "Pixel" }),
    });
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(vi.mocked(prisma.pushDeviceToken.upsert)).toHaveBeenCalled();
  });

  it("deactivates token for authenticated user", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "u1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.pushDeviceToken.updateMany).mockResolvedValue({ count: 1 } as never);

    const req = new Request("http://localhost", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "ExponentPushToken[test]" }),
    });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.pushDeviceToken.updateMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: "u1" }),
        data: { isActive: false },
      }),
    );
  });
});
