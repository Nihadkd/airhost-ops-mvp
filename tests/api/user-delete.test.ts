import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    notification: { updateMany: vi.fn(), deleteMany: vi.fn() },
    comment: { deleteMany: vi.fn() },
    message: { deleteMany: vi.fn() },
    image: { deleteMany: vi.fn() },
    review: { deleteMany: vi.fn() },
    serviceOrder: { updateMany: vi.fn(), count: vi.fn() },
    pushDeviceToken: { deleteMany: vi.fn() },
    user: {
      findUnique: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { DELETE } from "@/app/api/users/[id]/route";

describe("DELETE /api/users/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes user as admin", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN", accountRole: "ADMIN" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", role: "UTLEIER" } as never);
    vi.mocked(prisma.serviceOrder.count)
      .mockResolvedValueOnce(0 as never)
      .mockResolvedValueOnce(0 as never);
    vi.mocked(prisma.user.delete).mockResolvedValue({ id: "u1" } as never);
    vi.mocked(prisma.$transaction).mockImplementation(async (cb: (tx: typeof prisma) => Promise<unknown>) => cb(prisma) as never);

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(200);
    expect(vi.mocked(prisma.user.delete)).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(vi.mocked(prisma.serviceOrder.updateMany)).toHaveBeenCalledWith({
      where: { assignedToId: "u1", status: "PENDING" },
      data: {
        assignedToId: null,
        assignmentStatus: "UNASSIGNED",
        status: "PENDING",
      },
    });
  });

  it("blocks deleting own user", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN", accountRole: "ADMIN" },
    } as never);

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "admin1" }) });
    expect(res.status).toBe(409);
  });

  it("blocks deleting user who owns orders", async () => {
    vi.mocked(requireAuth).mockResolvedValue({
      user: { id: "admin1", role: "ADMIN", accountRole: "ADMIN" },
    } as never);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: "u1", role: "UTLEIER" } as never);
    vi.mocked(prisma.serviceOrder.count)
      .mockResolvedValueOnce(2 as never)
      .mockResolvedValueOnce(0 as never);

    const res = await DELETE(new Request("http://localhost"), { params: Promise.resolve({ id: "u1" }) });
    expect(res.status).toBe(409);
    expect(vi.mocked(prisma.user.delete)).not.toHaveBeenCalled();
  });
});
