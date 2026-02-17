"use client";

import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";

type User = { id: string; name: string; role: "ADMIN" | "UTLEIER" | "TJENESTE" };
type Comment = { id: string; text: string; user: User };
type ImageItem = { id: string; url: string; kind: string | null; caption: string | null; comments: Comment[] };
type Order = {
  id: string;
  address: string;
  note: string | null;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  landlord: { id: string; name: string; email?: string | null };
  assignedTo: { id: string; name: string; email?: string | null } | null;
  images: ImageItem[];
};

type Worker = { id: string; name: string; role: "ADMIN" | "UTLEIER" | "TJENESTE" };

export function OrderDetailClient({ initialOrder, role, workers }: { initialOrder: Order; role: string; workers: Worker[] }) {
  const [order, setOrder] = useState(initialOrder);
  const { t } = useLanguage();

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const landlordMail =
    order.landlord.email ? `mailto:${order.landlord.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;
  const workerMail =
    order.assignedTo?.email ? `mailto:${order.assignedTo.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;

  const refresh = async () => {
    const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
    if (!res.ok) return;
    setOrder(await res.json());
  };

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
      toast.error("Opplasting feilet");
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

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Oppdrag</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">{order.type} | {order.address}</p>
        <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 underline">{t("openMap")} i Google Maps</a>
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
            {landlordMail && <a href={landlordMail} className="text-teal-700 underline">{t("contactLandlord")}</a>}
            {workerMail && <a href={workerMail} className="text-teal-700 underline">{t("contactWorker")}</a>}
          </div>
        )}
        {order.note && <p className="mt-2 rounded bg-slate-100 p-2 text-sm">{order.note}</p>}

        {(role === "TJENESTE" || role === "ADMIN") && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-secondary" onClick={() => updateStatus("IN_PROGRESS")}>Start</button>
            <button className="btn btn-primary" onClick={() => updateStatus("COMPLETED")}>Marker fullført</button>
          </div>
        )}

        {role === "ADMIN" && (
          <form action={assign} className="mt-4 flex flex-wrap gap-2">
            <select name="assignedToId" className="input max-w-sm" defaultValue="">
              <option value="" disabled>Velg tjenesteutfører</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>{worker.name}</option>
              ))}
            </select>
            <button className="btn btn-primary">Tildel</button>
          </form>
        )}
      </div>

      {(role === "TJENESTE" || role === "ADMIN") && (
        <form action={upload} className="panel flex flex-wrap items-end gap-2 p-4 sm:p-5">
          <div>
            <label className="mb-1 block text-sm">Bilde</label>
            <input type="file" className="input" name="file" required />
          </div>
          <div>
            <label className="mb-1 block text-sm">Type</label>
            <select name="kind" className="input">
              <option value="before">For</option>
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

      <div className="grid gap-4 md:grid-cols-2">
        {order.images.map((image) => (
          <div key={image.id} className="panel p-4">
            <Image src={image.url} alt="order" width={800} height={500} className="h-56 w-full rounded object-cover" />
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
    </div>
  );
}
