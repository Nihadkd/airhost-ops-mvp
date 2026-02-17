"use client";

import { useEffect, useState } from "react";
import { useNotificationStore } from "@/lib/use-notification-store";

type Notification = {
  id: string;
  message: string;
  isRead: boolean;
};

export function NotificationPopup() {
  const { popupOpen, setPopupOpen } = useNotificationStore();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    const run = async () => {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Notification[];
      const unread = data.filter((n) => !n.isRead);
      setItems(unread);
      if (unread.length > 0) setPopupOpen(true);
    };
    run();
  }, [setPopupOpen]);

  const close = async () => {
    await Promise.all(items.map((item) => fetch(`/api/notifications/${item.id}/read`, { method: "PUT" })));
    setItems([]);
    setPopupOpen(false);
  };

  if (!popupOpen || items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[90%] max-w-sm panel p-4">
      <p className="font-semibold">Nye meldinger</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="rounded bg-slate-100 p-2">{item.message}</li>
        ))}
      </ul>
      <button onClick={close} className="btn btn-primary mt-3">Marker som lest</button>
    </div>
  );
}