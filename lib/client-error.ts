type Translator = (key: string) => string;

type ErrorPayload = {
  code?: string;
  error?: string;
};

const codeToKey: Record<string, string> = {
  EMAIL_EXISTS: "registerReasonEmailExists",
  INVALID_PAYLOAD: "registerReasonInvalidPayload",
  DB_UNAVAILABLE: "registerReasonDbUnavailable",
  USER_NOT_FOUND: "userNotFound",
  REGISTER_FAILED: "registerReasonUnknown",
  ORDER_NOT_STARTED: "orderStartRequired",
  WORKER_SEQUENCE_BLOCKED: "workerSequenceBlocked",
};

const errorToKey: Record<string, string> = {
  Unauthorized: "unauthorizedError",
  Forbidden: "forbiddenError",
  "Order not found": "notFoundError",
  "User not found": "userNotFound",
  "Message not found": "notFoundError",
  "Comment not found": "notFoundError",
  "Notification not found": "notFoundError",
  "Image not found": "notFoundError",
  "Invalid payload": "registerReasonInvalidPayload",
  "Order date must be on the hour or half hour": "timeSlotHalfHourOnly",
  "Database is temporarily unavailable": "serviceUnavailableError",
  "Internal server error": "genericError",
};

const statusToKey: Record<number, string> = {
  400: "registerReasonInvalidPayload",
  401: "unauthorizedError",
  403: "forbiddenError",
  404: "notFoundError",
  409: "conflictError",
  503: "serviceUnavailableError",
};

export async function toUserErrorMessage(
  response: Response,
  t: Translator,
  fallbackKey = "genericError",
): Promise<string> {
  const payload = (await response.json().catch(() => null)) as ErrorPayload | null;

  if (payload?.code && codeToKey[payload.code]) return t(codeToKey[payload.code]);
  if (payload?.error && errorToKey[payload.error]) return t(errorToKey[payload.error]);
  if (statusToKey[response.status]) return t(statusToKey[response.status]);
  if (payload?.error) return payload.error;
  return t(fallbackKey);
}
