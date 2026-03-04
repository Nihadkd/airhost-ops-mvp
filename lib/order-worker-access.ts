type WorkerWritableOrder = {
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  assignedToId: string | null;
};

export function canAssignedWorkerStartOrder(order: WorkerWritableOrder, userId: string, isAdmin: boolean) {
  if (isAdmin) return order.status === "PENDING";
  return order.assignedToId === userId && order.status === "PENDING";
}

export function canAssignedWorkerWriteOrder(order: WorkerWritableOrder, userId: string, isAdmin: boolean) {
  if (isAdmin) return true;
  return order.assignedToId === userId && order.status === "IN_PROGRESS";
}

export function isAssignedWorkerPendingStart(order: WorkerWritableOrder, userId: string, isAdmin: boolean) {
  if (isAdmin) return false;
  return order.assignedToId === userId && order.status === "PENDING";
}

