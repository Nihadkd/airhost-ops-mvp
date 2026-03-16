import { Prisma } from "@prisma/client";
import { ApiRouteError } from "@/lib/api";
import {
  acquireAddressClaimLock,
  findClaimableOrderById,
  markOrderAsClaimed,
  withOrderClaimTransaction,
  type ClaimableOrder,
} from "@/lib/repositories/service-order-repository";

const MAX_CLAIM_RETRIES = 2;

type ClaimOrderInput = {
  orderId: string;
  workerId: string;
  workerName?: string | null;
};

type ClaimOrderTransactionResult = {
  order: ClaimableOrder;
  claimedNow: boolean;
};

function buildClaimedOrder(order: ClaimableOrder, workerId: string): ClaimableOrder {
  return {
    ...order,
    assignedToId: workerId,
    status: "PENDING",
    assignmentStatus: "PENDING_LANDLORD_APPROVAL",
  };
}

function isRetryableSerializationError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

async function runClaimTransaction(input: ClaimOrderInput): Promise<ClaimOrderTransactionResult> {
  return withOrderClaimTransaction(async (tx) => {
    const targetOrder = await findClaimableOrderById(tx, input.orderId);
    if (!targetOrder) {
      throw new ApiRouteError(404, "Order not found");
    }

    await acquireAddressClaimLock(tx, targetOrder.address);

    const lockedOrder = await findClaimableOrderById(tx, input.orderId);
    if (!lockedOrder) {
      throw new ApiRouteError(404, "Order not found");
    }

    if (lockedOrder.assignedToId === input.workerId && lockedOrder.assignmentStatus === "PENDING_LANDLORD_APPROVAL") {
      return { order: lockedOrder, claimedNow: false };
    }

    if (lockedOrder.status !== "PENDING" || lockedOrder.assignedToId !== null || lockedOrder.assignmentStatus !== "UNASSIGNED") {
      throw new ApiRouteError(409, "Order already assigned", { code: "ORDER_ALREADY_ASSIGNED" });
    }

    const claimResult = await markOrderAsClaimed(tx, input.orderId, input.workerId);
    if (claimResult.count === 0) {
      throw new ApiRouteError(409, "Order already assigned", { code: "ORDER_ALREADY_ASSIGNED" });
    }

    const claimedOrder = buildClaimedOrder(lockedOrder, input.workerId);

    await tx.message.create({
      data: {
        orderId: input.orderId,
        senderId: input.workerId,
        recipientId: claimedOrder.landlordId,
        text: "Hei! Jeg vil gjerne utfore dette oppdraget. Godkjenn meg gjerne her inne.",
      },
    });

    return { order: claimedOrder, claimedNow: true };
  });
}

export async function claimOrderForWorker(input: ClaimOrderInput) {
  let attempt = 0;

  for (;;) {
    try {
      const result = await runClaimTransaction(input);
      return { order: result.order };
    } catch (error) {
      if (attempt >= MAX_CLAIM_RETRIES || !isRetryableSerializationError(error)) {
        throw error;
      }
      attempt += 1;
    }
  }
}
