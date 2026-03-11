import { Prisma } from "@prisma/client";
import { ApiRouteError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const WORKER_SEQUENCE_BLOCKED_MESSAGE = "Du må fullføre tidligere oppdrag før du kan starte dette.";
const MAX_START_RETRIES = 2;

type StartOrderResult = {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  assignedToId: string | null;
  assignmentStatus?: string | null;
};

type StartOrderInput = {
  orderId: string;
  workerId: string;
};

type StartAvailability = {
  canStart: boolean;
  blockedByOrderId: string | null;
  blockedByOrderNumber: number | null;
};

function isRetryableSerializationError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

function normalizeWorkerLockKey(workerId: string) {
  return workerId.trim().toLowerCase();
}

async function runStartTransaction(input: StartOrderInput) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${normalizeWorkerLockKey(input.workerId)}, 0))`;

    const targetOrder = await tx.serviceOrder.findUnique({
      where: { id: input.orderId },
      select: {
        id: true,
        orderNumber: true,
        date: true,
        status: true,
        assignmentStatus: true,
        assignedToId: true,
      },
    });

    if (!targetOrder) {
      throw new ApiRouteError(404, "Order not found");
    }

    if (targetOrder.assignedToId !== input.workerId) {
      throw new ApiRouteError(403, "Forbidden");
    }

    if (targetOrder.assignmentStatus !== "CONFIRMED") {
      throw new ApiRouteError(409, "Order assignment is not fully approved yet", { code: "ASSIGNMENT_NOT_CONFIRMED" });
    }

    if (targetOrder.status === "IN_PROGRESS") {
      return targetOrder;
    }

    if (targetOrder.status !== "PENDING") {
      throw new ApiRouteError(409, "Order cannot be started", { code: "ORDER_CANNOT_START" });
    }

    const earliestOpenOrder = await tx.serviceOrder.findFirst({
      where: {
        assignedToId: input.workerId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      select: {
        id: true,
        orderNumber: true,
        date: true,
        status: true,
        assignmentStatus: true,
        assignedToId: true,
      },
      orderBy: [{ date: "asc" }, { orderNumber: "asc" }],
    });

    if (!earliestOpenOrder) {
      throw new ApiRouteError(404, "Order not found");
    }

    if (earliestOpenOrder.id !== input.orderId) {
      throw new ApiRouteError(409, WORKER_SEQUENCE_BLOCKED_MESSAGE, {
        code: "WORKER_SEQUENCE_BLOCKED",
        details: {
          blockedByOrderId: earliestOpenOrder.id,
          blockedByOrderNumber: earliestOpenOrder.orderNumber,
        },
      });
    }

    return tx.serviceOrder.update({
      where: { id: input.orderId },
      data: { status: "IN_PROGRESS" },
      select: {
        id: true,
        status: true,
        assignedToId: true,
        assignmentStatus: true,
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });
}

export async function startOrderForWorker(input: StartOrderInput): Promise<StartOrderResult> {
  let attempt = 0;

  for (;;) {
    try {
      return await runStartTransaction(input);
    } catch (error) {
      if (attempt >= MAX_START_RETRIES || !isRetryableSerializationError(error)) {
        throw error;
      }
      attempt += 1;
    }
  }
}

export async function getStartAvailabilityForWorker(orderId: string, workerId: string): Promise<StartAvailability> {
  const order = await prisma.serviceOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      date: true,
      status: true,
      assignmentStatus: true,
      assignedToId: true,
    },
  });

  if (!order || order.assignedToId !== workerId || order.status !== "PENDING" || order.assignmentStatus !== "CONFIRMED") {
    return {
      canStart: false,
      blockedByOrderId: null,
      blockedByOrderNumber: null,
    };
  }

  const earliestOpenOrder = await prisma.serviceOrder.findFirst({
    where: {
      assignedToId: workerId,
      OR: [
        { status: "IN_PROGRESS" },
        { status: "PENDING", assignmentStatus: "CONFIRMED" },
      ],
    },
    select: {
      id: true,
      orderNumber: true,
    },
    orderBy: [{ date: "asc" }, { orderNumber: "asc" }],
  });

  if (!earliestOpenOrder) {
    return {
      canStart: false,
      blockedByOrderId: null,
      blockedByOrderNumber: null,
    };
  }

  return {
    canStart: earliestOpenOrder.id === orderId,
    blockedByOrderId: earliestOpenOrder.id === orderId ? null : earliestOpenOrder.id,
    blockedByOrderNumber: earliestOpenOrder.id === orderId ? null : earliestOpenOrder.orderNumber,
  };
}
