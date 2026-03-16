"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { getServiceTypeTranslationKey } from "@/lib/service-types";

type Conversation = {
  id: string;
  address: string;
  type: string;
  date: string;
  landlord: { id: string; name: string };
  assignedTo: { id: string; name: string } | null;
  lastMessage: { text: string; createdAt: string | Date } | null;
};

export function MessagesPageClient({
  conversations,
  currentUserId,
  currentRole,
  isAdmin,
}: {
  conversations: Conversation[];
  currentUserId: string;
  currentRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  isAdmin: boolean;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-US";
  const orderedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  const getTypeLabel = (type: string) => {
    const key = getServiceTypeTranslationKey(type);
    if (key) return t(key);
    return type;
  };
  const getConversationParty = (conversation: Conversation) => {
    if (isAdmin) return null;
    if (currentRole === "UTLEIER") {
      return conversation.assignedTo?.name ?? t("unassignedWorker");
    }
    if (currentRole === "TJENESTE") {
      return conversation.landlord.name;
    }
    if (conversation.landlord.id === currentUserId) {
      return conversation.assignedTo?.name ?? t("unassignedWorker");
    }
    return conversation.landlord.name;
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{t("messageCenter")}</h1>
      </div>
      <div className="panel p-5">
        {orderedConversations.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noMessagesYet")}</p>
        ) : (
          <div className="space-y-3">
            {orderedConversations.map((conversation) => (
              <article key={conversation.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold">{getTypeLabel(conversation.type)}</p>
                {isAdmin ? (
                  <div className="mt-1 space-y-0.5 text-sm text-slate-600">
                    <p>{t("landlords")}: {conversation.landlord.name}</p>
                    <p>{t("responsible")}: {conversation.assignedTo?.name ?? t("unassignedWorker")}</p>
                  </div>
                ) : (
                  <p className="mt-1 text-sm text-slate-600">
                    {t("conversationWith")}: {getConversationParty(conversation)}
                  </p>
                )}
                <p className="text-sm text-slate-600">{conversation.address}</p>
                <p className="text-xs text-slate-500">
                  {new Date(conversation.date).toLocaleString(locale, { hour12: false })}
                </p>
                <p className="mt-2 text-sm text-slate-700">{conversation.lastMessage?.text ?? "-"}</p>
                <Link href={`/orders/${conversation.id}`} className="mt-3 inline-block text-sm text-teal-700 underline">
                  {t("openConversation")}
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
