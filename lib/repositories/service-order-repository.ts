import { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OrderRepositoryClient = Pick<typeof prisma, "$executeRaw" | "serviceOrder" | "message" | "notification">;

export type ClaimableOrder = {
  id: string;
  orderNumber: number;
  address: string;
  date: Date;
  status: OrderStatus;
  assignedToId: string | null;
  landlordId: string;
};

const claimOrderSelect = {
  id: true,
  orderNumber: true,
  address: true,
  date: true,
  status: true,
  assignedToId: true,
  landlordId: true,
} satisfies Prisma.ServiceOrderSelect;

function normalizeAddressLockKey(address: string) {
  return address.trim().toLowerCase();
}

export async function withOrderClaimTransaction<T>(callback: (tx: OrderRepositoryClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => callback(tx as unknown as OrderRepositoryClient), {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  }) as Promise<T>;
}

export async function acquireAddressClaimLock(tx: OrderRepositoryClient, address: string) {
  const lockKey = normalizeAddressLockKey(address);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;
}

export async function findClaimableOrderById(tx: OrderRepositoryClient, orderId: string) {
  return tx.serviceOrder.findUnique({
    where: { id: orderId },
    select: claimOrderSelect,
  }) as Promise<ClaimableOrder | null>;
}

export async function findEarlierOpenOrderOnAddress(tx: OrderRepositoryClient, order: ClaimableOrder) {
  return tx.serviceOrder.findFirst({
    where: {
      address: order.address,
      status: { in: ["PENDING", "IN_PROGRESS"] },
      NOT: { id: order.id },
      OR: [
        { date: { lt: order.date } },
        {
          AND: [
            { date: order.date },
            { orderNumber: { lt: order.orderNumber } },
          ],
        },
      ],
    },
    select: claimOrderSelect,
    orderBy: [{ date: "asc" }, { orderNumber: "asc" }],
  }) as Promise<ClaimableOrder | null>;
}

export async function markOrderAsClaimed(tx: OrderRepositoryClient, orderId: string, workerId: string) {
  return tx.serviceOrder.updateMany({
    where: {
      id: orderId,
      status: "PENDING",
      assignedToId: null,
    },
    data: {
      status: "IN_PROGRESS",
      assignedToId: workerId,
    },
  });
}
