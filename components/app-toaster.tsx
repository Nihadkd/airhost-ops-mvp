"use client";

import { useEffect, useRef, useState } from "react";
import { Toaster, ToastBar, toast } from "react-hot-toast";
import type { Toast } from "react-hot-toast";

function DismissibleToastBar({ item }: { item: Toast }) {
  const [dragX, setDragX] = useState(0);
  const startXRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!item.visible) return;

    dismissTimerRef.current = window.setTimeout(() => {
      toast.dismiss(item.id);
    }, 5000);

    return () => {
      if (dismissTimerRef.current) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, [item.id, item.visible]);

  const beginDrag = (clientX: number) => {
    startXRef.current = clientX;
  };

  const updateDrag = (clientX: number) => {
    if (startXRef.current === null) return;
    setDragX(clientX - startXRef.current);
  };

  const endDrag = (clientX?: number) => {
    if (startXRef.current === null) return;
    const delta = typeof clientX === "number" ? clientX - startXRef.current : dragX;
    if (Math.abs(delta) >= 80) {
      toast.dismiss(item.id);
    }
    startXRef.current = null;
    setDragX(0);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    beginDrag(event.clientX);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    updateDrag(event.clientX);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current === null) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    endDrag(event.clientX);
  };

  return (
    <div
      data-testid="app-toast"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      style={{
        transform: `translateX(${dragX}px)`,
        opacity: Math.max(0.35, 1 - Math.abs(dragX) / 180),
        transition: startXRef.current === null ? "transform 0.18s ease, opacity 0.18s ease" : "none",
        touchAction: "pan-y",
      }}
    >
      <ToastBar toast={item} />
    </div>
  );
}

export function AppToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 5000,
        removeDelay: 0,
      }}
    >
      {(item) => <DismissibleToastBar item={item} />}
    </Toaster>
  );
}
