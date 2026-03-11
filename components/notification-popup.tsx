"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { playNotificationSound } from "@/lib/play-notification-sound";
import { useNotificationStore } from "@/lib/use-notification-store";

type Notification = {
  id: string;
  message: string;
  isRead: boolean;
  actorUserId?: string | null;
  targetUrl?: string | null;
};

export function NotificationPopup() {
  const { popupOpen, setPopupOpen } = useNotificationStore();
  const [items, setItems] = useState<Notification[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const { t } = useLanguage();
  const pathname = usePathname();

  const notifyBrowser = (item: Notification) => {
    if (typeof window === "undefined" || typeof Notification === "undefined") return;
    if (document.visibilityState === "visible") return;

    const show = () => {
      const n = new Notification("ServNest", { body: item.message, tag: item.id });
      n.onclick = () => {
        window.focus();
        window.location.href = item.targetUrl || "/messages";
      };
    };

    if (Notification.permission === "granted") {
      show();
      return;
    }
    if (Notification.permission === "default") {
      void Notification.requestPermission().then((permission) => {
        if (permission === "granted") show();
      });
    }
  };

  useEffect(() => {
    const askPermissionOnFirstInteraction = () => {
      if (typeof window === "undefined" || typeof Notification === "undefined") return;
      if (Notification.permission === "default") {
        void Notification.requestPermission();
      }
      window.removeEventListener("pointerdown", askPermissionOnFirstInteraction);
    };

    window.addEventListener("pointerdown", askPermissionOnFirstInteraction, { once: true });
    return () => window.removeEventListener("pointerdown", askPermissionOnFirstInteraction);
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const res = await fetch("/api/notifications?unreadOnly=1&limit=10", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Notification[];
      if (!active) return;

      const freshItems = data.filter((item) => !seenIdsRef.current.has(item.id));
      if (freshItems.length > 0) {
        freshItems.forEach((item) => seenIdsRef.current.add(item.id));
        playNotificationSound();
        notifyBrowser(freshItems[0]);
      }

      // Keep notifications visible even when user is already on target page.
      // Auto-marking as read here can make important events appear "lost".
      setItems(data);
      if (data.length > 0) setPopupOpen(true);
    };
    void run();
    const poll = setInterval(() => {
      void run();
    }, 4000);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [pathname, setPopupOpen]);

  const close = async () => {
    const toMarkRead = [...items];
    setItems([]);
    setPopupOpen(false);
    void Promise.allSettled(toMarkRead.map((item) => fetch(`/api/notifications/${item.id}/read`, { method: "PUT" })));
  };

  const openNotification = async (item: Notification) => {
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
    setPopupOpen(false);
    void fetch(`/api/notifications/${item.id}/read`, { method: "PUT" });
  };

  if (!popupOpen || items.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[90%] max-w-sm panel p-4">
      <p className="font-semibold">{t("newMessages")}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map((item) => (
          <li key={item.id} className="rounded bg-slate-100 p-2">
            <Link
              href={item.targetUrl || "/messages"}
              className="underline"
              onClick={() => void openNotification(item)}
            >
              {item.message}
            </Link>
          </li>
        ))}
      </ul>
      <button onClick={close} className="btn btn-primary mt-3">{t("markAsRead")}</button>
    </div>
  );
}
