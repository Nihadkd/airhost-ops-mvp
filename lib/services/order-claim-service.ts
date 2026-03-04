import { Prisma } from "@prisma/client";
import { ApiRouteError } from "@/lib/api";
import { sendPushToUser } from "@/lib/push";
import {
  acquireAddressClaimLock,
  findClaimableOrderById,
  findEarlierOpenOrderOnAddress,
  markOrderAsClaimed,
  withOrderClaimTransaction,
  type ClaimableOrder,
} from "@/lib/repositories/service-order-repository";

const CLAIM_SEQUENCE_BLOCKED_MESSAGE = "Du må fullføre tidligere oppdrag på denne adressen før du kan starte dette.";
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

    if (lockedOrder.assignedToId === input.workerId && lockedOrder.status === "IN_PROGRESS") {
      return { order: lockedOrder, claimedNow: false };
    }

    if (lockedOrder.status !== "PENDING" || lockedOrder.assignedToId !== null) {
      throw new ApiRouteError(409, "Order already assigned", { code: "ORDER_ALREADY_ASSIGNED" });
    }

    const blockingOrder = await findEarlierOpenOrderOnAddress(tx, lockedOrder);
    if (blockingOrder) {
      throw new ApiRouteError(409, CLAIM_SEQUENCE_BLOCKED_MESSAGE, {
        code: "ADDRESS_SEQUENCE_BLOCKED",
        details: {
          blockedByOrderId: blockingOrder.id,
          blockedByOrderNumber: blockingOrder.orderNumber,
          address: blockingOrder.address,
        },
      });
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
        text: "Hei! Jeg har tatt oppdraget. Her kan vi kommunisere direkte om detaljer.",
      },
    });

    await tx.notification.create({
      data: {
        userId: claimedOrder.landlordId,
        actorUserId: input.workerId,
        message: `Oppdrag #${claimedOrder.orderNumber} er tatt av ${input.workerName ?? "tjenesteutfører"}.`,
        targetUrl: `/orders/${input.orderId}`,
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
      if (result.claimedNow) {
        await sendPushToUser(result.order.landlordId, {
          title: "Oppdrag tatt",
          body: `Oppdrag #${result.order.orderNumber} er tatt av ${input.workerName ?? "tjenesteutfører"}.`,
          data: { orderId: input.orderId, type: "order_claimed", path: `/orders/${input.orderId}` },
        });
      }

      return { order: result.order };
    } catch (error) {
      if (attempt >= MAX_CLAIM_RETRIES || !isRetryableSerializationError(error)) {
        throw error;
      }
      attempt += 1;
    }
  }
}
