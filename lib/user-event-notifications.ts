import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

type UserRecipient = {
  userId: string;
  email?: string | null;
  name?: string | null;
};

type PushPayload = Parameters<typeof sendPushToUser>[1];

type NotifyUserEventInput = {
  recipient: UserRecipient;
  actorUserId?: string | null;
  message: string;
  targetUrl?: string | null;
  push?: PushPayload;
  email?: (() => Promise<unknown>) | null;
};

export async function notifyUserEvent(input: NotifyUserEventInput) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.recipient.userId,
      actorUserId: input.actorUserId ?? null,
      message: input.message,
      targetUrl: input.targetUrl ?? null,
    },
  });

  const [pushDelivery, emailDelivery] = await Promise.all([
    input.push ? sendPushToUser(input.recipient.userId, input.push) : Promise.resolve(null),
    input.email
      ? input.email().catch((error) => {
          console.error("[notify] email_delivery_failed", {
            userId: input.recipient.userId,
            targetUrl: input.targetUrl ?? null,
            error: error instanceof Error ? error.message : String(error),
          });
          return null;
        })
      : Promise.resolve(null),
  ]);

  return {
    notification,
    deliveries: {
      push: pushDelivery,
      email: emailDelivery,
    },
  };
}
