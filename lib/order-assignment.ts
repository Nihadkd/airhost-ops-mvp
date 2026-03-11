export const assignmentStatuses = {
  UNASSIGNED: "UNASSIGNED",
  PENDING_WORKER_ACCEPTANCE: "PENDING_WORKER_ACCEPTANCE",
  PENDING_LANDLORD_APPROVAL: "PENDING_LANDLORD_APPROVAL",
  CONFIRMED: "CONFIRMED",
} as const;

export type AssignmentStatus = (typeof assignmentStatuses)[keyof typeof assignmentStatuses];

type AssignmentLikeOrder = {
  assignedToId: string | null;
  assignmentStatus?: string | null;
};

export function isAssignmentConfirmed(order: AssignmentLikeOrder) {
  return order.assignedToId !== null && order.assignmentStatus === assignmentStatuses.CONFIRMED;
}

export function isAwaitingWorkerAcceptance(order: AssignmentLikeOrder) {
  return order.assignedToId !== null && order.assignmentStatus === assignmentStatuses.PENDING_WORKER_ACCEPTANCE;
}

export function isAwaitingLandlordApproval(order: AssignmentLikeOrder) {
  return order.assignedToId !== null && order.assignmentStatus === assignmentStatuses.PENDING_LANDLORD_APPROVAL;
}
