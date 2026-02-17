"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";

type User = { id: string; name: string; role: "ADMIN" | "UTLEIER" | "TJENESTE" };
type Comment = { id: string; text: string; user: User };
type Message = {
  id: string;
  text: string;
  createdAt: string | Date;
  senderId: string;
  recipientId: string;
  sender: User;
  recipient: User;
};
type ImageItem = {
  id: string;
  url: string;
  kind: string | null;
  caption: string | null;
  uploadedBy?: User;
  comments: Comment[];
};
type Order = {
  id: string;
  address: string;
  note: string | null;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  landlord: { id: string; name: string; email?: string | null };
  assignedTo: { id: string; name: string; email?: string | null } | null;
  images: ImageItem[];
  messages: Message[];
};

type Worker = { id: string; name: string; role: "ADMIN" | "UTLEIER" | "TJENESTE" };

export function OrderDetailClient({
  initialOrder,
  role,
  workers,
  currentUserId,
}: {
  initialOrder: Order;
  role: string;
  workers: Worker[];
  currentUserId: string;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [messages, setMessages] = useState<Message[]>(initialOrder.messages ?? []);
  const [chatOpen, setChatOpen] = useState(false);
  const { t } = useLanguage();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const landlordMail =
    order.landlord.email ? `mailto:${order.landlord.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;
  const workerMail =
    order.assignedTo?.email ? `mailto:${order.assignedTo.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;

  const isPrivateChatParticipant = role === "UTLEIER" || role === "TJENESTE";

  const landlordImageCount = useMemo(() => {
    return order.images.filter((img) => img.uploadedBy?.role === "TJENESTE").length;
  }, [order.images]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const nextOrder = (await res.json()) as Order;
    setOrder(nextOrder);
    if (isPrivateChatParticipant) {
      setMessages(nextOrder.messages ?? []);
    }
  }, [isPrivateChatParticipant, order.id]);

  const refreshMessages = useCallback(async () => {
    if (!isPrivateChatParticipant) return;
    const res = await fetch(`/api/orders/${order.id}/messages`, { cache: "no-store" });
    if (!res.ok) return;
    setMessages((await res.json()) as Message[]);
  }, [isPrivateChatParticipant, order.id]);

  useEffect(() => {
    if (!isPrivateChatParticipant) return;
    const timer = setInterval(() => {
      void refreshMessages();
    }, 8000);
    return () => clearInterval(timer);
  }, [isPrivateChatParticipant, refreshMessages]);

  const updateStatus = async (status: string) => {
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Kunne ikke oppdatere status");
      return;
    }
    toast.success("Status oppdatert");
    await refresh();
  };

  const assign = async (formData: FormData) => {
    const assignedToId = String(formData.get("assignedToId"));
    const res = await fetch(`/api/orders/${order.id}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (!res.ok) {
      toast.error("Kunne ikke tildele");
      return;
    }
    toast.success("Oppdrag tildelt");
    await refresh();
  };

  const upload = async (formData: FormData) => {
    formData.append("orderId", order.id);
    const res = await fetch("/api/images/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Opplasting feilet");
      return;
    }
    toast.success("Bilde lastet opp");
    await refresh();
  };

  const comment = async (formData: FormData) => {
    const payload = { imageId: String(formData.get("imageId")), text: String(formData.get("text")) };
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Kunne ikke kommentere");
      return;
    }
    await refresh();
  };

  const sendMessage = async (formData: FormData) => {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) return;

    const res = await fetch(`/api/orders/${order.id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      toast.error(body?.error ?? "Kunne ikke sende melding");
      return;
    }

    await refreshMessages();
  };

  const chatContent = (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Privat chat</h2>
        <span className="text-xs text-slate-500">Kun mellom utleier og tjenesteutfører</span>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto rounded border border-slate-200 bg-white p-3">
        {messages.length === 0 && <p className="text-sm text-slate-500">Ingen meldinger ennå.</p>}
        {messages.map((msg) => (
          <div key={msg.id} className={`rounded-lg p-2 text-sm ${msg.senderId === currentUserId ? "bg-teal-50" : "bg-slate-100"}`}>
            <p className="font-medium">{msg.sender.name}</p>
            <p>{msg.text}</p>
            <p className="mt-1 text-xs text-slate-500">{new Date(msg.createdAt).toLocaleString("nb-NO", { hour12: false })}</p>
          </div>
        ))}
      </div>
      <form action={sendMessage} className="mt-3 flex gap-2">
        <input className="input" name="text" placeholder="Skriv melding" required />
        <button className="btn btn-primary">Send</button>
      </form>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Oppdrag</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {order.type} | {order.address}
        </p>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 underline">
          {t("openMap")} i Google Maps
        </a>
        <p className="mt-2 text-sm text-slate-600">Utleier: {order.landlord.name}</p>
        <p className="text-sm text-slate-600">Tildelt: {order.assignedTo?.name ?? "Ingen"}</p>
        {role === "TJENESTE" && landlordMail && (
          <a href={landlordMail} className="mt-2 inline-block text-sm text-teal-700 underline">
            {t("contactLandlord")}
          </a>
        )}
        {role === "UTLEIER" && workerMail && (
          <a href={workerMail} className="mt-2 inline-block text-sm text-teal-700 underline">
            {t("contactWorker")}
          </a>
        )}
        {role === "ADMIN" && (
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            {landlordMail && (
              <a href={landlordMail} className="text-teal-700 underline">
                {t("contactLandlord")}
              </a>
            )}
            {workerMail && (
              <a href={workerMail} className="text-teal-700 underline">
                {t("contactWorker")}
              </a>
            )}
          </div>
        )}
        {order.note && <p className="mt-2 rounded bg-slate-100 p-2 text-sm">{order.note}</p>}

        {(role === "TJENESTE" || role === "ADMIN") && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => updateStatus("IN_PROGRESS")}>
              Start
            </button>
            <button className="btn btn-primary" onClick={() => updateStatus("COMPLETED")}>
              Marker fullført
            </button>
          </div>
        )}

        {role === "ADMIN" && (
          <form action={assign} className="mt-4 flex flex-wrap gap-2">
            <select name="assignedToId" className="input max-w-sm" defaultValue="">
              <option value="" disabled>
                Velg tjenesteutfører
              </option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary">Tildel</button>
          </form>
        )}
      </div>

      {isPrivateChatParticipant && (
        <section className="panel hidden p-4 sm:block sm:p-5">{chatContent}</section>
      )}

      {(role === "TJENESTE" || role === "ADMIN") && (
        <form action={upload} className="panel flex flex-wrap items-end gap-2 p-4 sm:p-5">
          <div>
            <label className="mb-1 block text-sm">Bilde</label>
            <input type="file" className="input" name="file" required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Type</label>
            <select name="kind" className="input">
              <option value="before">Før</option>
              <option value="after">Etter</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">Kommentar</label>
            <input name="caption" className="input" />
          </div>
          <button className="btn btn-primary">Last opp</button>
        </form>
      )}

      {role === "UTLEIER" && (
        <section className="panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">Bilder av din leilighet</h2>
          <p className="mt-1 text-sm text-slate-600">Antall bilder fra tjenesteutfører: {landlordImageCount}</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {order.images.map((image) => (
          <div key={image.id} className="panel p-4">
            <Image
              src={image.url}
              alt="order"
              width={800}
              height={500}
              unoptimized={image.url.startsWith("data:")}
              className="h-56 w-full rounded object-cover"
            />
            <p className="mt-2 text-xs uppercase text-slate-500">{image.kind ?? "bilde"}</p>
            <p className="text-sm">{image.caption}</p>
            <div className="mt-2 space-y-2 text-sm">
              {image.comments.map((item) => (
                <div key={item.id} className="rounded bg-slate-100 p-2">
                  <strong>{item.user.name}:</strong> {item.text}
                </div>
              ))}
            </div>
            <form action={comment} className="mt-3 flex gap-2">
              <input type="hidden" name="imageId" value={image.id} />
              <input className="input" name="text" placeholder="Skriv kommentar" required />
              <button className="btn btn-secondary">Send</button>
            </form>
          </div>
        ))}
      </div>

      {isPrivateChatParticipant && (
        <>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="fixed bottom-5 right-5 z-40 rounded-full bg-teal-700 px-4 py-3 text-sm font-semibold text-white shadow-lg sm:hidden"
          >
            Chat
          </button>

          {chatOpen && (
            <div className="fixed inset-0 z-50 flex items-end bg-black/30 sm:hidden">
              <div className="max-h-[82vh] w-full rounded-t-2xl bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">Chat</h3>
                  <button type="button" className="text-sm text-slate-600 underline" onClick={() => setChatOpen(false)}>
                    Lukk
                  </button>
                </div>
                {chatContent}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
