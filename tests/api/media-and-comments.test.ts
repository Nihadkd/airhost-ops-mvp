import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rbac", () => ({ requireAuth: vi.fn() }));
vi.mock("@/lib/upload", () => ({ saveUpload: vi.fn().mockResolvedValue("/uploads/test.jpg") }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceOrder: { findUnique: vi.fn() },
    image: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    comment: { create: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
  },
}));

import { requireAuth } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { POST as createImage } from "@/app/api/images/route";
import { POST as uploadImage } from "@/app/api/images/upload/route";
import { POST as createComment } from "@/app/api/comments/route";

describe("/api/images and /api/comments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST /api/images", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", assignedToId: "t1" } as never);
    vi.mocked(prisma.image.create).mockResolvedValue({ id: "i1" } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ orderId: "o1", url: "https://img.com/a.jpg" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createImage(req);
    expect(res.status).toBe(201);
  });

  it("POST /api/images/upload", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "t1", role: "TJENESTE" } } as never);
    vi.mocked(prisma.serviceOrder.findUnique).mockResolvedValue({ id: "o1", assignedToId: "t1" } as never);
    vi.mocked(prisma.image.create).mockResolvedValue({ id: "i1" } as never);

    const fd = new FormData();
    fd.append("orderId", "o1");
    fd.append("file", new File(["x"], "x.jpg", { type: "image/jpeg" }));

    const req = new Request("http://localhost", { method: "POST", body: fd });
    const res = await uploadImage(req);
    expect(res.status).toBe(201);
  });

  it("POST /api/comments", async () => {
    vi.mocked(requireAuth).mockResolvedValue({ user: { id: "l1", role: "UTLEIER" } } as never);
    vi.mocked(prisma.image.findUnique).mockResolvedValue({ id: "i1", order: { landlordId: "l1", assignedToId: "t1" } } as never);
    vi.mocked(prisma.comment.create).mockResolvedValue({ id: "c1" } as never);

    const req = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ imageId: "i1", text: "Looks good" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await createComment(req);
    expect(res.status).toBe(201);
  });
});