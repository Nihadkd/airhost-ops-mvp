"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import toast from "react-hot-toast";
import { StatusBadge } from "@/components/status-badge";
import { useLanguage } from "@/lib/language-context";
import { playNotificationSound } from "@/lib/play-notification-sound";
import { toUserErrorMessage } from "@/lib/client-error";
import {
  getServiceTypeTranslationKey,
  isChecklistServiceType,
  isGuestCountServiceType,
  isValidServiceType,
  ORDERABLE_SERVICE_TYPES,
} from "@/lib/service-types";

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
  orderNumber?: number;
  updatedAt: string | Date;
  assignmentStatus?: "UNASSIGNED" | "PENDING_WORKER_ACCEPTANCE" | "PENDING_LANDLORD_APPROVAL" | "CONFIRMED";
  canStart?: boolean;
  startBlockedByOrderId?: string | null;
  startBlockedByOrderNumber?: number | null;
  address: string;
  date: string | Date;
  deadlineAt?: string | null;
  note: string | null;
  guestCount?: number | null;
  completionNote?: string | null;
  completionChecklist?: Record<string, boolean> | null | unknown;
  type: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  landlord: { id: string; name: string; email?: string | null };
  assignedTo: { id: string; name: string; email?: string | null; averageRating?: number | null; reviewCount?: number } | null;
  images: ImageItem[];
  messages?: Message[];
};

type Worker = {
  id: string;
  name: string;
  role: "ADMIN" | "UTLEIER" | "TJENESTE";
  averageRating?: number | null;
  reviewCount?: number;
};
type ReceiptSummary = {
  id: string;
  receiptNumber: string;
  amountNok: number;
  paidAt: string | Date;
  downloadUrl: string;
};
type PaymentSummary = {
  status: "not_started" | "pending" | "paid";
  provider: "stub" | "vipps" | "stripe";
  amountNok: number;
  paymentIntent: string | null;
  receiptId: string | null;
  paidAt: string | Date | null;
};

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
  const router = useRouter();
  const [order, setOrder] = useState(initialOrder);
  const [messages, setMessages] = useState<Message[]>(initialOrder.messages ?? []);
  const [statusSaving, setStatusSaving] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [assignSaving, setAssignSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);
  const [pendingCompletionFormData, setPendingCompletionFormData] = useState<FormData | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [selectedReviewRating, setSelectedReviewRating] = useState(5);
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [sendingPaymentReminder, setSendingPaymentReminder] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptSummary | null>(null);
  const [payment, setPayment] = useState<PaymentSummary | null>(null);
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);
  const [visibleImageCount, setVisibleImageCount] = useState(12);
  const [loadedImageIds, setLoadedImageIds] = useState<Record<string, true>>({});
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const [fullscreenZoom, setFullscreenZoom] = useState(1);
  const [chatHighlighted, setChatHighlighted] = useState(false);
  const [focusedMessageId, setFocusedMessageId] = useState<string | null>(null);
  const [newMessageNotice, setNewMessageNotice] = useState(false);
  const [newMessageNoticeDragX, setNewMessageNoticeDragX] = useState(0);
  const [editValues, setEditValues] = useState({
    type: initialOrder.type,
    address: initialOrder.address,
    date: new Date(initialOrder.date).toISOString().slice(0, 16),
    guestCount: initialOrder.guestCount ? String(initialOrder.guestCount) : "",
    note: initialOrder.note ?? "",
  });
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-GB";
  const refreshMessagesBusyRef = useRef(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatHighlightTimerRef = useRef<number | null>(null);
  const newMessageNoticeTimerRef = useRef<number | null>(null);
  const newMessageNoticeRef = useRef<HTMLDivElement | null>(null);
  const newMessageNoticeDragStartRef = useRef<number | null>(null);
  const latestIncomingMessageIdRef = useRef<string>(
    [...(initialOrder.messages ?? [])].reverse().find((msg) => msg.senderId !== currentUserId)?.id ?? "",
  );

  const renderWorkerRating = useCallback((averageRating?: number | null, reviewCount?: number) => {
    if (!averageRating || !reviewCount) return null;
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
        <span aria-hidden="true">★</span>
        <span>{averageRating.toFixed(1)}</span>
        <span className="text-amber-700/80">({reviewCount})</span>
      </span>
    );
  }, []);

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
  const showApiError = useCallback(async (res: Response, fallbackKey = "genericError") => {
    toast.error(await toUserErrorMessage(res, t, fallbackKey));
  }, [t]);
  const landlordMail =
    order.landlord.email ? `mailto:${order.landlord.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;
  const workerMail =
    order.assignedTo?.email ? `mailto:${order.assignedTo.email}?subject=${encodeURIComponent(`Spørsmål om oppdrag ${order.id}`)}` : null;
  const suggestedPaymentAmount = payment?.amountNok ?? (order.type === "KEY_HANDLING" ? 500 : 600);

  const isLandlordParticipant = order.landlord.id === currentUserId;
  const isWorkerParticipant = order.assignedTo?.id === currentUserId;
  const isParticipant = isLandlordParticipant || isWorkerParticipant;
  const isPrivateChatParticipant = isParticipant || role === "ADMIN";
  const assignmentStatus = order.assignmentStatus ?? "UNASSIGNED";
  const isAssignmentConfirmed = assignmentStatus === "CONFIRMED";
  const isAwaitingWorkerAcceptance = assignmentStatus === "PENDING_WORKER_ACCEPTANCE";
  const isAwaitingLandlordApproval = assignmentStatus === "PENDING_LANDLORD_APPROVAL";
  const canUseJobChat = !!order.assignedTo?.id && isAssignmentConfirmed && isPrivateChatParticipant;
  const isReadOnlyChat = !isParticipant;
  const workerPendingStart = role !== "ADMIN" && isWorkerParticipant && order.status === "PENDING" && isAssignmentConfirmed;
  const canWorkerWriteToJob = role === "ADMIN" || !isWorkerParticipant || order.status === "IN_PROGRESS";
  const canWorkerSendMessages = !isReadOnlyChat && canWorkerWriteToJob;
  const canUploadImages = role === "ADMIN" || isLandlordParticipant || ((role === "TJENESTE") && canWorkerWriteToJob);
  const canWorkerComplete = (role === "TJENESTE" || role === "ADMIN") && order.status === "IN_PROGRESS";
  const usesCompletionChecklist = isChecklistServiceType(order.type);
  const canCommentOnImages = role === "ADMIN" || !isWorkerParticipant || order.status === "IN_PROGRESS";
  const canStartOrder = (role === "TJENESTE" || role === "ADMIN") && !!order.assignedTo && order.status === "PENDING" && isAssignmentConfirmed;
  const startAvailableNow = role === "ADMIN" ? canStartOrder : canStartOrder && order.canStart === true;

  const landlordImageCount = useMemo(() => {
    return order.images.filter((img) => img.uploadedBy?.role === "TJENESTE").length;
  }, [order.images]);
  const visibleImages = useMemo(
    () => order.images.slice(0, Math.max(0, visibleImageCount)),
    [order.images, visibleImageCount],
  );
  const hasMoreImages = order.images.length > visibleImageCount;
  const completionChecklist = (order.completionChecklist ?? {}) as Record<string, boolean>;
  const checklistKeys = [
    "bedReady",
    "bathroomClean",
    "kitchenClean",
    "floorsVacuumed",
    "trashHandled",
    "keysHandled",
    "towelsPrepared",
    "suppliesRefilled",
    "allRoomsPhotographed",
  ];
  const formatChecklistLabel = useCallback((key: string) => {
    const guests = order.guestCount ?? 0;
    if (guests > 0 && key === "bedReady") {
      return lang === "no"
        ? `Er seng klargjort for ${guests} ${guests === 1 ? "person" : "personer"}`
        : `Are beds prepared for ${guests} ${guests === 1 ? "guest" : "guests"}`;
    }
    if (guests > 0 && key === "towelsPrepared") {
      return lang === "no"
        ? `Er det lagt frem håndklær for ${guests} ${guests === 1 ? "person" : "personer"}`
        : `Are towels prepared for ${guests} ${guests === 1 ? "guest" : "guests"}`;
    }
    return t(key);
  }, [lang, order.guestCount, t]);
  const orderTypeKey = getServiceTypeTranslationKey(order.type);
  const orderTypeLabel = orderTypeKey ? t(orderTypeKey) : order.type;
  const assignmentStatusLabel =
    assignmentStatus === "PENDING_WORKER_ACCEPTANCE"
      ? t("assignmentPendingWorker")
      : assignmentStatus === "PENDING_LANDLORD_APPROVAL"
        ? t("assignmentPendingLandlord")
        : assignmentStatus === "CONFIRMED"
          ? t("assignmentConfirmed")
          : t("assignmentUnassigned");
  const assignmentStatusHint =
    assignmentStatus === "PENDING_WORKER_ACCEPTANCE"
      ? t("assignmentPendingWorkerHint")
      : assignmentStatus === "PENDING_LANDLORD_APPROVAL"
        ? t("assignmentPendingLandlordHint")
        : assignmentStatus === "CONFIRMED"
          ? t("assignmentConfirmedHint")
          : t("assignmentUnassignedHint");
  const closeFullscreenImage = useCallback(() => {
    setFullscreenImageUrl(null);
    setFullscreenZoom(1);
  }, []);
  const dismissNewMessageNotice = useCallback(() => {
    setNewMessageNotice(false);
    setNewMessageNoticeDragX(0);
    if (newMessageNoticeTimerRef.current) {
      window.clearTimeout(newMessageNoticeTimerRef.current);
      newMessageNoticeTimerRef.current = null;
    }
  }, []);
  const beginNewMessageNoticeDrag = useCallback((clientX: number) => {
    newMessageNoticeDragStartRef.current = clientX;
  }, []);
  const updateNewMessageNoticeDrag = useCallback((clientX: number) => {
    if (newMessageNoticeDragStartRef.current === null) return;
    setNewMessageNoticeDragX(clientX - newMessageNoticeDragStartRef.current);
  }, []);
  const endNewMessageNoticeDrag = useCallback((finalClientX?: number) => {
    if (newMessageNoticeDragStartRef.current === null) return;
    const delta =
      typeof finalClientX === "number"
        ? finalClientX - newMessageNoticeDragStartRef.current
        : newMessageNoticeDragX;
    if (Math.abs(delta) >= 100) {
      dismissNewMessageNotice();
    } else {
      setNewMessageNoticeDragX(0);
    }
    newMessageNoticeDragStartRef.current = null;
  }, [dismissNewMessageNotice, newMessageNoticeDragX]);

  useEffect(() => {
    const valid = new Set(order.images.map((img) => img.id));
    setLoadedImageIds((prev) => {
      const next: Record<string, true> = {};
      for (const key of Object.keys(prev)) {
        if (valid.has(key)) next[key] = true;
      }
      return next;
    });
  }, [order.images]);

  useEffect(() => {
    setVisibleImageCount((prev) => {
      if (prev <= 0) return 12;
      return Math.min(Math.max(prev, 12), Math.max(12, order.images.length));
    });
  }, [order.images.length]);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const nextOrder = (await res.json()) as Order;
    setOrder(nextOrder);
  }, [order.id]);

  const refreshReceipt = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}/receipt`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as ReceiptSummary;
    setReceipt(data);
  }, [order.id]);

  const refreshPayment = useCallback(async () => {
    const res = await fetch(`/api/orders/${order.id}/payment`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as PaymentSummary;
    setPayment(data);
  }, [order.id]);

  useEffect(() => {
    if (role !== "UTLEIER" && role !== "ADMIN") return;
    void refreshReceipt();
    void refreshPayment();
  }, [refreshPayment, refreshReceipt, role]);

  const scrollChatToNewest = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = chatScrollRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const refreshMessages = useCallback(async (opts?: { playAlert?: boolean }) => {
    if (!canUseJobChat) return;
    if (refreshMessagesBusyRef.current) return;
    refreshMessagesBusyRef.current = true;
    try {
      const res = await fetch(`/api/orders/${order.id}/messages`, { cache: "no-store" });
      if (res.ok) {
        const nextMessages = (await res.json()) as Message[];
        setMessages(nextMessages);
        window.requestAnimationFrame(() => {
          scrollChatToNewest(opts?.playAlert ? "smooth" : "auto");
        });

        const latestIncoming = [...nextMessages].reverse().find((msg) => msg.senderId !== currentUserId);
        if (latestIncoming && latestIncoming.id !== latestIncomingMessageIdRef.current) {
          latestIncomingMessageIdRef.current = latestIncoming.id;

            if (opts?.playAlert !== false && typeof document !== "undefined" && document.visibilityState === "visible") {
              playNotificationSound();
              setChatHighlighted(true);
              setNewMessageNotice(true);
              setNewMessageNoticeDragX(0);
              if (chatHighlightTimerRef.current) window.clearTimeout(chatHighlightTimerRef.current);
              chatHighlightTimerRef.current = window.setTimeout(() => setChatHighlighted(false), 4500);
              if (newMessageNoticeTimerRef.current) window.clearTimeout(newMessageNoticeTimerRef.current);
              newMessageNoticeTimerRef.current = window.setTimeout(() => dismissNewMessageNotice(), 5000);
            }
          }
        }
    } finally {
      refreshMessagesBusyRef.current = false;
    }
  }, [canUseJobChat, currentUserId, order.id, scrollChatToNewest]);

  useEffect(() => {
    if (!canUseJobChat) return;
    const timer = window.setTimeout(() => {
      void refreshMessages({ playAlert: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canUseJobChat, refreshMessages]);

  useEffect(() => {
    if (!canUseJobChat) return;
    const timer = window.setTimeout(() => {
      scrollChatToNewest("auto");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [canUseJobChat, scrollChatToNewest]);

  useEffect(() => {
    if (!canUseJobChat) return;
    if (typeof window === "undefined" || "EventSource" in window) return;
    const timer = setInterval(() => {
      void refreshMessages();
    }, 15000);
    return () => clearInterval(timer);
  }, [canUseJobChat, refreshMessages]);

  useEffect(() => {
    if (!canUseJobChat) return;
    if (typeof window === "undefined") return;

    const stream = new EventSource(`/api/orders/${order.id}/messages/stream`);
    stream.onmessage = (event) => {
      const raw = event.data;
      if (!raw) return;
      try {
        const payload = JSON.parse(raw) as { type?: string };
        if (payload.type === "message" || payload.type === "reconnect") {
          void refreshMessages({ playAlert: payload.type === "message" });
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };
    stream.onerror = () => {
      stream.close();
    };

    return () => {
      stream.close();
    };
  }, [canUseJobChat, order.id, refreshMessages]);

  useEffect(() => {
    return () => {
      if (chatHighlightTimerRef.current) window.clearTimeout(chatHighlightTimerRef.current);
      if (newMessageNoticeTimerRef.current) window.clearTimeout(newMessageNoticeTimerRef.current);
    };
  }, [dismissNewMessageNotice]);

  useEffect(() => {
    const element = newMessageNoticeRef.current;
    if (!element) return;

    const onMouseDown = (event: MouseEvent) => {
      event.preventDefault();
      beginNewMessageNoticeDrag(event.clientX);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (newMessageNoticeDragStartRef.current === null) return;
      updateNewMessageNoticeDrag(event.clientX);
    };
    const onMouseUp = (event: MouseEvent) => {
      if (newMessageNoticeDragStartRef.current === null) return;
      endNewMessageNoticeDrag(event.clientX);
    };
    const onTouchStart = (event: TouchEvent) => {
      beginNewMessageNoticeDrag(event.touches[0]?.clientX ?? 0);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (newMessageNoticeDragStartRef.current === null) return;
      updateNewMessageNoticeDrag(event.touches[0]?.clientX ?? 0);
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (newMessageNoticeDragStartRef.current === null) return;
      endNewMessageNoticeDrag(event.changedTouches[0]?.clientX ?? undefined);
    };

    element.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    element.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      element.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [beginNewMessageNoticeDrag, endNewMessageNoticeDrag, newMessageNotice, updateNewMessageNoticeDrag]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash.startsWith("#msg-")) return;
    const messageId = hash.slice(5);
    if (!messageId || !messages.some((msg) => msg.id === messageId)) return;

    const focus = () => {
      const target = document.getElementById(`msg-${messageId}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setFocusedMessageId(messageId);
      window.setTimeout(() => setFocusedMessageId((prev) => (prev === messageId ? null : prev)), 4000);
    };

    window.setTimeout(focus, 50);
  }, [messages]);

  const updateStatus = async (status: string) => {
    const previous = order.status;
    setStatusSaving(true);
    setOrder((prev) => ({ ...prev, status: status as Order["status"] }));

    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setOrder((prev) => ({ ...prev, status: previous }));
      await showApiError(res);
      setStatusSaving(false);
      return;
    }
    toast.success(t("statusUpdated"));
    setStatusSaving(false);
    void refresh();
  };

  const claimJob = async () => {
    if ((role !== "TJENESTE" && role !== "ADMIN") || order.assignedTo || assignmentStatus !== "UNASSIGNED") return;
    setClaiming(true);
    const res = await fetch(`/api/orders/${order.id}/claim`, { method: "PUT" });
    setClaiming(false);
    if (!res.ok) {
      await showApiError(res, "cannotTakeJob");
      return;
    }
    toast.success(t("assignmentApprovalRequested"));
    await refresh();
  };

  const acceptAssignment = async () => {
    setClaiming(true);
    const res = await fetch(`/api/orders/${order.id}/assignment/accept`, { method: "PUT" });
    setClaiming(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("assignmentAcceptedSuccess"));
    await refresh();
  };

  const approveAssignment = async () => {
    setStatusSaving(true);
    const res = await fetch(`/api/orders/${order.id}/assignment/approve`, { method: "PUT" });
    setStatusSaving(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("assignmentApprovedSuccess"));
    await refresh();
  };

  const cancelAssignment = async () => {
    const confirmed = window.confirm(t("confirmCancelAssignment"));
    if (!confirmed) return;
    setAssignSaving(true);
    const res = await fetch(`/api/orders/${order.id}/assignment/cancel`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAssignSaving(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("assignmentCancelledSuccess"));
    await refresh();
  };

  const completeWithChecklist = async (formData: FormData) => {
    setCompleting(true);
    const checklist = usesCompletionChecklist
      ? {
          bedReady: formData.get("bedReady") === "on",
          bathroomClean: formData.get("bathroomClean") === "on",
          kitchenClean: formData.get("kitchenClean") === "on",
          floorsVacuumed: formData.get("floorsVacuumed") === "on",
          trashHandled: formData.get("trashHandled") === "on",
          keysHandled: formData.get("keysHandled") === "on",
          towelsPrepared: formData.get("towelsPrepared") === "on",
          suppliesRefilled: formData.get("suppliesRefilled") === "on",
          allRoomsPhotographed: formData.get("allRoomsPhotographed") === "on",
        }
      : null;
    const completionNote = String(formData.get("completionNote") ?? "");

    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED", completionNote, completionChecklist: checklist }),
    });
    setCompleting(false);
    if (!res.ok) {
      toast.error(t("completeOrderFailed"));
      return;
    }
    toast.success(t("statusOk"));
    await refresh();
  };

  const handleCompleteSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPendingCompletionFormData(new FormData(event.currentTarget));
    setCompleteConfirmOpen(true);
  };

  const confirmCompleteSubmit = async () => {
    if (!pendingCompletionFormData) return;
    setCompleteConfirmOpen(false);
    await completeWithChecklist(pendingCompletionFormData);
    setPendingCompletionFormData(null);
  };

  const submitReview = async (formData: FormData) => {
    if (!order.assignedTo?.id) return;
    setReviewing(true);
    const rating = Number(formData.get("rating"));
    const comment = String(formData.get("comment") ?? "");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workerId: order.assignedTo.id, orderId: order.id, rating, comment }),
    });
    setReviewing(false);
    if (!res.ok) {
      toast.error(t("reviewFailed"));
      return;
    }
    toast.success(t("reviewSubmitted"));
  };

  const assign = async (formData: FormData) => {
    setAssignSaving(true);
    const assignedToId = String(formData.get("assignedToId"));
    const res = await fetch(`/api/orders/${order.id}/assign`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedToId }),
    });
    if (!res.ok) {
      await showApiError(res);
      setAssignSaving(false);
      return;
    }
    const nextWorker = workers.find((worker) => worker.id === assignedToId) ?? null;
    setOrder((prev) => ({
      ...prev,
      assignedTo: nextWorker ? { id: nextWorker.id, name: nextWorker.name, email: null } : prev.assignedTo,
      assignmentStatus: "PENDING_WORKER_ACCEPTANCE",
    }));
    toast.success(t("orderAssignedSuccess"));
    setAssignSaving(false);
    void refresh();
  };

  const compressImageFile = useCallback(async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;
    if (file.size <= 450 * 1024) return file;

    const createCompressedFromCanvas = async (canvas: HTMLCanvasElement) => {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.78);
      });
      if (!blob) return file;
      if (blob.size >= file.size * 0.95) return file;
      const safeBase = file.name.replace(/\.[^.]+$/, "") || "upload";
      return new File([blob], `${safeBase}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
    };

    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(file);
        const maxSide = 1600;
        const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * ratio));
        const height = Math.max(1, Math.round(bitmap.height * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return file;
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        return createCompressedFromCanvas(canvas);
      }
    } catch {
      // Fall through to non-compressed original file.
    }

    return file;
  }, []);

  const handleUploadSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const original = new FormData(form);
    const fileList = original
      .getAll("files")
      .filter((item): item is File => item instanceof File)
      .filter((file) => file.size > 0 && file.name.trim().length > 0);
    if (fileList.length === 0) {
      toast.error("Please choose an image before uploading.");
      return;
    }

    setUploading(true);
    try {
      const optimizedFiles = await Promise.all(fileList.map((file) => compressImageFile(file)));
      const payload = new FormData();
      payload.append("orderId", order.id);
      payload.append("kind", String(original.get("kind") ?? ""));
      payload.append("caption", String(original.get("caption") ?? ""));
      for (const file of optimizedFiles) {
        payload.append("files", file);
      }

      const res = await fetch("/api/images/upload", { method: "POST", body: payload });
      if (!res.ok) {
        await showApiError(res);
        return;
      }

      const body = (await res.json().catch(() => null)) as { count?: number } | null;
      const count = body?.count ?? 1;
      toast.success(count > 1 ? `${count} ${t("imageUploadedMultiple")}` : t("imageUploadedSingle"));
      form.reset();
      await refresh();
    } finally {
      setUploading(false);
    }
  }, [compressImageFile, order.id, refresh, showApiError, t]);

  const comment = async (formData: FormData) => {
    const payload = { imageId: String(formData.get("imageId")), text: String(formData.get("text")) };
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await showApiError(res);
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
      await showApiError(res, "cannotSendMessage");
      return;
    }

    dismissNewMessageNotice();
    await refreshMessages({ playAlert: false });
  };

  const deleteMessage = async (messageId: string) => {
    const confirmed = window.confirm(t("confirmDeleteMessage"));
    if (!confirmed) return;

    const res = await fetch(`/api/orders/${order.id}/messages/${messageId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("messageDeleted"));
    await refreshMessages({ playAlert: false });
  };

  const deleteImage = async (imageId: string) => {
    const confirmed = window.confirm(t("confirmDeleteImage"));
    if (!confirmed) return;

    setDeletingImageId(imageId);
    const res = await fetch(`/api/images/${imageId}`, {
      method: "DELETE",
    });
    setDeletingImageId(null);

    if (!res.ok) {
      await showApiError(res);
      return;
    }

    toast.success(t("imageDeleted"));
    await refresh();
  };

  const saveOrderChanges = async (formData: FormData) => {
    const type = String(formData.get("type") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const dateValue = String(formData.get("date") ?? "").trim();
    const guestCountValue = String(formData.get("guestCount") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!type || !address || !dateValue) {
      toast.error(t("addressDateRequired"));
      return;
    }
    if (!isValidServiceType(type)) {
      toast.error(t("invalidServiceType"));
      return;
    }

    let guestCount: number | null = null;
    if (guestCountValue) {
      const parsedGuestCount = Number(guestCountValue);
      if (!Number.isInteger(parsedGuestCount) || parsedGuestCount < 1 || parsedGuestCount > 50) {
        toast.error(t("guestCountRange"));
        return;
      }
      guestCount = parsedGuestCount;
    }

    const isoDate = new Date(dateValue).toISOString();
    setSavingEdit(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        address,
        date: isoDate,
        guestCount: isGuestCountServiceType(type) ? guestCount : null,
        note: note.length ? note : "",
      }),
    });
    setSavingEdit(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }

    toast.success(t("orderUpdated"));
    setEditing(false);
    await refresh();
  };

  const deleteOrder = async () => {
    const confirmed = window.confirm(t("confirmDeleteOrder"));
    if (!confirmed) return;
    setDeleting(true);
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      await showApiError(res);
      return;
    }

    toast.success(t("orderDeleted"));
    router.push("/dashboard");
    router.refresh();
  };

  const issueReceipt = async () => {
    const suggested = String(suggestedPaymentAmount);
    const raw = window.prompt(t("receiptAmountPrompt"), suggested);
    if (raw === null) return;
    const amountNok = Number(raw.trim());
    if (!Number.isFinite(amountNok) || amountNok < 1) {
      toast.error(t("invalidAmount"));
      return;
    }

    setSendingReceipt(true);
    const res = await fetch(`/api/orders/${order.id}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNok }),
    });
    setSendingReceipt(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("receiptSent"));
    void refreshReceipt();
    void refreshPayment();
  };

  const createPayment = async () => {
    const amountNok = Math.max(1, Math.floor(suggestedPaymentAmount));
    const confirmKey = order.landlord.id === currentUserId ? "paymentCreateConfirm" : "paymentCreateConfirmWithReminder";
    const confirmed = window.confirm(t(confirmKey).replace("{{amount}}", String(amountNok)));
    if (!confirmed) return;

    setPaymentBusy(true);
    const res = await fetch(`/api/orders/${order.id}/payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNok }),
    });
    setPaymentBusy(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    const payload = (await res.json().catch(() => null)) as { checkoutUrl?: string | null; reminderSent?: boolean } | null;
    toast.success(payload?.reminderSent ? t("paymentCreatedAndReminderSent") : t("paymentCreated"));
    if (payload?.checkoutUrl) {
      window.location.assign(payload.checkoutUrl);
      return;
    }
    void refreshPayment();
  };

  const confirmPayment = async () => {
    const suggested = String(suggestedPaymentAmount);
    const raw = window.prompt(t("paymentAmountPrompt"), suggested);
    if (raw === null) return;
    const amountNok = Number(raw.trim());
    if (!Number.isFinite(amountNok) || amountNok < 1) {
      toast.error(t("invalidAmount"));
      return;
    }

    setPaymentBusy(true);
    const res = await fetch(`/api/orders/${order.id}/payment/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountNok }),
    });
    setPaymentBusy(false);
    if (!res.ok) {
      await showApiError(res);
      return;
    }
    toast.success(t("paymentConfirmed"));
    void refreshPayment();
    void refreshReceipt();
  };

  const sendPaymentReminder = async () => {
    setSendingPaymentReminder(true);
    const res = await fetch(`/api/orders/${order.id}/payment/reminder`, { method: "POST" });
    setSendingPaymentReminder(false);
    if (!res.ok) {
      await showApiError(res, "paymentReminderFailed");
      return;
    }
    toast.success(t("paymentReminderSent"));
  };

  const chatContent = (
    <>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("privateChat")}</h2>
          <span className="text-xs text-slate-500">{t("privateChatHint")}</span>
        </div>
        {newMessageNotice && (
          <div
            data-testid="new-message-notice"
            ref={newMessageNoticeRef}
            className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900"
            style={{
              transform: `translateX(${newMessageNoticeDragX}px)`,
              opacity: Math.max(0.35, 1 - Math.abs(newMessageNoticeDragX) / 180),
              transition:
                newMessageNoticeDragStartRef.current === null
                  ? "transform 0.18s ease, opacity 0.18s ease"
                  : "none",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {t("newMessageNotice")}
          </div>
        )}
      <div
        ref={chatScrollRef}
        className={`max-h-72 space-y-1.5 overflow-y-auto rounded border p-2 transition-colors ${
          chatHighlighted ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
        }`}
      >
        {messages.length === 0 && <p className="text-sm text-slate-500">{t("noMessagesYet")}</p>}
        {messages.map((msg) => (
          <div
            key={msg.id}
            id={`msg-${msg.id}`}
            className={`rounded-md p-1.5 text-xs transition-colors ${
              focusedMessageId === msg.id
                ? "bg-amber-100 ring-1 ring-amber-300"
                : msg.senderId === currentUserId
                  ? "bg-teal-50"
                  : "bg-slate-100"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">{msg.sender.name}</p>
              {!isReadOnlyChat && msg.senderId === currentUserId && (
                <button
                  type="button"
                  onClick={() => void deleteMessage(msg.id)}
                  className="text-[11px] text-red-700 underline"
                >
                  {t("deleteLabel")}
                </button>
              )}
            </div>
            <p className="leading-snug">{msg.text}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{new Date(msg.createdAt).toLocaleString(locale, { hour12: false })}</p>
          </div>
        ))}
      </div>
      {!isReadOnlyChat && canWorkerSendMessages && (
        <form action={sendMessage} className="mt-3 flex gap-2">
          <input className="input" name="text" placeholder={t("writeMessagePlaceholder")} required />
          <button className="btn btn-primary">{t("send")}</button>
        </form>
      )}
      {!isReadOnlyChat && !canWorkerSendMessages && workerPendingStart && (
        <p className="mt-3 text-sm text-amber-700">{t("orderStartRequiredHint")}</p>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="panel p-4 sm:p-5">
        {typeof order.orderNumber === "number" && (
          <p className="mb-2 text-sm font-semibold text-slate-600">
            {t("orderIdNumber")}: <span className="text-slate-900">#{order.orderNumber}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">{t("orderTitle")}</h1>
          <StatusBadge status={order.status} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {orderTypeLabel} | {order.address}
        </p>
        <p className="text-sm text-slate-600">{new Date(order.date).toLocaleString(locale, { hour12: false })}</p>
        {order.deadlineAt ? (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{t("deadlineDateTimeLabel")}:</span>{" "}
            {new Date(order.deadlineAt).toLocaleString(locale, { hour12: false })}
          </p>
        ) : null}
        {order.status === "COMPLETED" ? (
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{t("completedService")}:</span>{" "}
            {new Date(order.updatedAt).toLocaleString(locale, { hour12: false })}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block h-[110px] w-[135px] max-w-full overflow-hidden rounded-xl border border-teal-300 bg-white shadow-sm transition hover:border-teal-400 hover:shadow"
            aria-label={t("openMap")}
            title={t("openMap")}
          >
            <iframe
              title={t("mapPreviewTitle")}
              src={`https://www.google.com/maps?q=${encodeURIComponent(order.address)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="pointer-events-none h-[90px] w-full border-0"
            />
            <div className="flex h-[20px] items-center justify-between border-t border-slate-200 bg-teal-50 px-3 text-[11px] font-semibold text-teal-900">
              <span>{t("miniMap")}</span>
              <span className="underline decoration-transparent group-hover:decoration-current">{t("openMap")}</span>
            </div>
          </a>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {t("landlordLabel")}:{" "}
          <Link href={`/users/${order.landlord.id}`} className="font-semibold text-slate-900 underline">
            {order.landlord.name}
          </Link>
        </p>
        <p className="text-sm text-slate-600">
          {t("assignedLabel")}:{" "}
          {order.assignedTo ? (
            <span className="inline-flex items-center">
              <Link href={`/users/${order.assignedTo.id}`} className="font-semibold text-slate-900 underline">
                {order.assignedTo.name}
              </Link>
              {renderWorkerRating(order.assignedTo.averageRating, order.assignedTo.reviewCount)}
            </span>
          ) : (
            t("noneAssigned")
          )}
        </p>
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <p className="font-semibold text-slate-900">{t("assignmentStatusLabel")}: {assignmentStatusLabel}</p>
          <p className="mt-1 text-slate-600">{assignmentStatusHint}</p>
        </div>
        {isPrivateChatParticipant && canUseJobChat && (
          <a href="#job-chat" className="mt-2 ml-3 inline-block text-sm font-semibold text-teal-700 underline">
            Chat
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
        {order.note && (
          <p className="mt-2 rounded bg-slate-100 p-2 text-sm whitespace-pre-wrap break-words">{order.note}</p>
        )}
        {workerPendingStart && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
            {t("orderStartRequiredHint")}
          </div>
        )}

        {(role === "UTLEIER" || role === "ADMIN") && (
          <div className="mt-4 rounded border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">{t("manageOrder")}</p>
              <button
                type="button"
                className="text-sm text-teal-700 underline"
                onClick={() => {
                  setEditValues({
                    type: order.type,
                    address: order.address,
                    date: new Date(order.date).toISOString().slice(0, 16),
                    guestCount: order.guestCount ? String(order.guestCount) : "",
                    note: order.note ?? "",
                  });
                  setEditing((prev) => !prev);
                }}
              >
                {editing ? t("cancel") : t("edit")}
              </button>
            </div>

            {editing && (
              <form action={saveOrderChanges} className="grid gap-2">
                <select
                  className="input"
                  name="type"
                  value={editValues.type}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, type: e.target.value }))}
                  required
                >
                  {ORDERABLE_SERVICE_TYPES.map((serviceType) => {
                    const key = getServiceTypeTranslationKey(serviceType);
                    return (
                      <option key={serviceType} value={serviceType}>
                        {key ? t(key) : serviceType}
                      </option>
                    );
                  })}
                </select>
                <input
                  className="input"
                  name="address"
                  value={editValues.address}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder={t("address")}
                  required
                />
                <input
                  className="input"
                  type="datetime-local"
                  name="date"
                  value={editValues.date}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, date: e.target.value }))}
                  required
                />
                {isGuestCountServiceType(editValues.type) ? (
                  <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-2">
                    <label className="mb-1 block text-sm font-bold text-slate-900">{t("guestCount")}</label>
                    <span className="mb-2 inline-flex rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      {t("importantField")}
                    </span>
                    <input
                      className="input border-amber-400 bg-white text-sm font-semibold"
                      type="number"
                      min={1}
                      max={50}
                      name="guestCount"
                      value={editValues.guestCount}
                      onChange={(e) => setEditValues((prev) => ({ ...prev, guestCount: e.target.value }))}
                      placeholder={t("guestCountPlaceholder")}
                    />
                  </div>
                ) : null}
                <textarea
                  className="input"
                  name="note"
                  value={editValues.note}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder={t("notePlaceholder")}
                />
                <button className="btn btn-primary w-fit" type="submit" disabled={savingEdit}>
                  {savingEdit ? t("saving") : t("saveChanges")}
                </button>
              </form>
            )}

            <button type="button" className="btn btn-danger mt-3" onClick={deleteOrder} disabled={deleting}>
              {deleting ? t("deleteOrderBusy") : t("deleteOrderAction")}
            </button>
          </div>
        )}
        {isGuestCountServiceType(order.type) && order.guestCount ? (
          <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
            <div
              className="mb-2 flex max-w-full items-center justify-between rounded-md border-2 border-amber-400 bg-amber-50 shadow-sm ring-1 ring-amber-200"
              style={{ width: 140, height: 36, paddingInline: 8 }}
            >
              <span className="font-bold uppercase text-amber-900" style={{ fontSize: 9, letterSpacing: "0.05em" }}>
                {t("guestCount")}
              </span>
              <span
                className="rounded-md bg-amber-200 font-extrabold leading-none text-amber-950"
                style={{ fontSize: 18, padding: "2px 6px" }}
              >
                {order.guestCount}
              </span>
            </div>
          </div>
        ) : null}

        {(role === "UTLEIER" || role === "ADMIN") && (
          <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{t("paymentSectionTitle")}</p>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {payment?.status === "paid"
                    ? t("paymentStatusPaid")
                    : payment?.status === "pending"
                      ? t("paymentStatusPending")
                      : t("paymentStatusNotStarted")}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {t("paymentAmountLabel")}: <span className="font-semibold text-slate-900">{payment?.amountNok ?? 0} NOK</span>
              </p>
              {payment?.paidAt ? (
                <p className="mt-1 text-sm text-slate-600">
                  {t("paymentPaidAtLabel")}: {new Date(payment.paidAt).toLocaleString(locale, { hour12: false })}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {payment?.status !== "paid" ? (
                  <>
                    <button className="btn btn-secondary" type="button" onClick={() => void createPayment()} disabled={paymentBusy}>
                      {paymentBusy ? t("saving") : t("paymentCreateAction")}
                    </button>
                    <button className="btn btn-primary" type="button" onClick={() => void confirmPayment()} disabled={paymentBusy}>
                      {paymentBusy ? t("saving") : t("paymentConfirmAction")}
                    </button>
                    {role === "ADMIN" ? (
                      <button
                        className="btn btn-secondary"
                        type="button"
                        onClick={() => void sendPaymentReminder()}
                        disabled={sendingPaymentReminder}
                      >
                        {sendingPaymentReminder ? t("paymentReminderBusy") : t("paymentReminderAction")}
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button className="btn btn-secondary" type="button" onClick={() => void issueReceipt()} disabled={sendingReceipt}>
                    {sendingReceipt ? t("sendReceiptBusy") : t("paymentResendReceipt")}
                  </button>
                )}
              </div>
            </div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {payment?.status === "paid" && !receipt ? (
                <button className="btn btn-secondary" type="button" onClick={() => void issueReceipt()} disabled={sendingReceipt}>
                  {sendingReceipt ? t("sendReceiptBusy") : t("sendReceipt")}
                </button>
              ) : null}
              {receipt ? (
                <a href={receipt.downloadUrl} target="_blank" rel="noreferrer" className="text-teal-700 underline">
                  {t("receiptLabel")} {receipt.receiptNumber} ({receipt.amountNok} NOK)
                </a>
              ) : null}
            </div>
            {order.status === "COMPLETED" ? (
              <p className="mb-1">
                <span className="font-semibold">{t("completedDate")}:</span>{" "}
                {new Date(order.updatedAt).toLocaleString(locale, { hour12: false })}
              </p>
            ) : null}
            <p className="font-semibold">{t("completionDetails")}</p>
            {order.completionNote || order.completionChecklist ? (
              <>
                {order.completionNote ? <p className="mt-1">{order.completionNote}</p> : null}
                {order.completionChecklist ? (
                  <ul className="mt-2 list-disc pl-5">
                    {Object.entries(order.completionChecklist).map(([key, done]) => (
                      <li key={key}>
                        {done ? t("statusOk") : t("checklistMissing")} - {formatChecklistLabel(key)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </>
            ) : (
              <p className="mt-1 text-slate-500">{t("noCompletionDetails")}</p>
            )}
          </div>
        )}

        {role === "ADMIN" && usesCompletionChecklist && (
          <div className="mt-3 rounded border border-slate-200 bg-white p-3 text-sm">
            <p className="font-semibold">{t("workerChecklist")}</p>
            <ul className="mt-2 space-y-1">
              {checklistKeys.map((key) => {
                const done = completionChecklist[key] === true;
                return (
                  <li key={key} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                    <span>{formatChecklistLabel(key)}</span>
                    <span className={done ? "text-emerald-700" : "text-slate-500"}>{done ? t("statusOk") : t("checklistMissing")}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {(role === "TJENESTE" || role === "ADMIN") && (
          <div className="mt-3 flex flex-wrap gap-2">
            {!order.assignedTo && assignmentStatus === "UNASSIGNED" && (
              <button className="btn btn-primary" disabled={claiming} onClick={() => void claimJob()}>
                {claiming ? "..." : t("takeJob")}
              </button>
            )}
            {isWorkerParticipant && isAwaitingWorkerAcceptance && (
              <>
                <button className="btn btn-primary" disabled={claiming} onClick={() => void acceptAssignment()}>
                  {claiming ? "..." : t("acceptAssignmentAction")}
                </button>
                <button className="btn btn-secondary" disabled={assignSaving} onClick={() => void cancelAssignment()}>
                  {assignSaving ? t("saving") : t("cancelAssignmentAction")}
                </button>
              </>
            )}
            {canStartOrder && (
              <button
                className={startAvailableNow ? "btn btn-danger" : "btn btn-secondary"}
                disabled={statusSaving}
                onClick={() => updateStatus("IN_PROGRESS")}
              >
                {statusSaving ? t("saving") : t("startAction")}
              </button>
            )}
          </div>
        )}

        {role === "ADMIN" && (
          <form action={assign} className="mt-4 flex flex-wrap gap-2">
            <select name="assignedToId" className="input max-w-sm" defaultValue="">
              <option value="" disabled>
                {t("selectWorker")}
              </option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                  {worker.averageRating && worker.reviewCount ? ` - ★ ${worker.averageRating.toFixed(1)} (${worker.reviewCount})` : ""}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" disabled={assignSaving || assignmentStatus !== "UNASSIGNED"}>
              {assignSaving ? t("assigning") : t("assignAction")}
            </button>
            {order.assignedTo && assignmentStatus === "CONFIRMED" ? (
              <button className="btn btn-secondary" type="button" disabled={assignSaving} onClick={() => void cancelAssignment()}>
                {assignSaving ? t("saving") : t("cancelAssignmentAction")}
              </button>
            ) : null}
          </form>
        )}

        {(role === "ADMIN" || isLandlordParticipant) && isAwaitingLandlordApproval && order.assignedTo ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-slate-900">{order.assignedTo.name}</span>
              {renderWorkerRating(order.assignedTo.averageRating, order.assignedTo.reviewCount) ?? (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {t("noReviewsYet")}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" type="button" disabled={statusSaving} onClick={() => void approveAssignment()}>
                {statusSaving ? t("saving") : t("approveAssignmentAction")}
              </button>
              <button className="btn btn-secondary" type="button" disabled={assignSaving} onClick={() => void cancelAssignment()}>
                {assignSaving ? t("saving") : t("cancelAssignmentAction")}
              </button>
            </div>
          </div>
        ) : null}

        {(role === "ADMIN" || isLandlordParticipant) &&
        order.assignedTo &&
        assignmentStatus === "PENDING_WORKER_ACCEPTANCE" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-secondary" type="button" disabled={assignSaving} onClick={() => void cancelAssignment()}>
              {assignSaving ? t("saving") : t("cancelAssignmentAction")}
            </button>
          </div>
        ) : null}

        {(role === "UTLEIER" || role === "ADMIN") && order.status === "COMPLETED" && order.assignedTo && (
          <form action={submitReview} className="mt-4 rounded border border-slate-200 p-3">
            <p className="text-sm font-semibold">{t("reviewWorker")}</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block">{t("rating")}</span>
                <input type="hidden" name="rating" value={selectedReviewRating} />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= selectedReviewRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setSelectedReviewRating(star)}
                        className={`inline-flex h-11 w-11 items-center justify-center rounded-full border text-2xl transition ${
                          active
                            ? "border-amber-400 bg-amber-100 text-amber-600"
                            : "border-slate-300 bg-white text-slate-400"
                        }`}
                        aria-label={`${t("reviewStarLabel")} ${star}`}
                        title={`${star}/5`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <span className="mt-2 block text-xs text-slate-500">{t("reviewPrompt")}</span>
              </label>
              <label className="text-sm sm:col-span-2">
                <span className="mb-1 block">{t("reviewComment")}</span>
                <textarea name="comment" className="input" placeholder={t("reviewTextPlaceholder")} required />
              </label>
            </div>
            <button className="btn btn-primary mt-3" type="submit" disabled={reviewing}>
              {reviewing ? t("sending") : t("send")}
            </button>
          </form>
        )}
      </div>

      {isPrivateChatParticipant && (
        <section id="job-chat" className={`panel p-4 sm:p-5 transition-colors ${chatHighlighted ? "ring-2 ring-emerald-300" : ""}`}>
          {canUseJobChat ? (
            chatContent
          ) : (
            <div>
              <h2 className="text-lg font-semibold">{t("privateChat")}</h2>
              <p className="mt-1 text-sm text-slate-600">{isAssignmentConfirmed ? t("chatPendingHint") : assignmentStatusHint}</p>
            </div>
          )}
        </section>
      )}

      {canUploadImages && (
        <form onSubmit={(event) => void handleUploadSubmit(event)} className="panel flex flex-wrap items-end gap-2 p-4 sm:p-5">
          <div>
            <p className="mb-1 block text-sm">{t("uploadImage")}</p>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor="camera-upload-input"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                title={t("uploadFromCamera")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>{t("uploadFromCamera")}</span>
              </label>
              <label
                htmlFor="attachment-upload-input"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                title={t("uploadFromLibrary")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65l-9.2 9.19a2 2 0 0 1-2.82-2.82l8.49-8.48" />
                </svg>
                <span>{t("uploadFromLibrary")}</span>
              </label>
            </div>
            <input id="camera-upload-input" type="file" className="hidden" name="files" accept="image/*" capture="environment" />
            <input id="attachment-upload-input" type="file" className="hidden" name="files" accept="image/*" multiple />
          </div>
          <div>
            <label className="mb-1 block text-sm">{t("uploadType")}</label>
            <select name="kind" className="input">
              <option value="before">{t("beforeLabel")}</option>
              <option value="after">{t("afterLabel")}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">{t("commentLabel")}</label>
            <input name="caption" className="input" />
          </div>
          <button className="btn btn-primary" disabled={uploading}>{uploading ? t("sending") : t("uploadAction")}</button>
        </form>
      )}

      {(role === "UTLEIER" || role === "ADMIN") && (
        <section className="panel p-4 sm:p-5">
          <h2 className="text-lg font-semibold">{t("orderImagesTitle")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("workerImageCountLabel")}: {landlordImageCount}</p>
        </section>
      )}

      {order.images.length === 0 && (
        <section className="panel p-4 sm:p-5">
          <p className="text-sm text-slate-500">{t("noImagesYet")}</p>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {visibleImages.map((image) => (
          <div key={image.id} className="panel p-4">
            <div className="relative h-56 w-full overflow-hidden rounded">
              {!loadedImageIds[image.id] && (
                <div className="absolute inset-0 animate-pulse bg-slate-200" aria-hidden="true" />
              )}
              <Image
                src={image.url}
                alt="order"
                width={800}
                height={500}
                loading="lazy"
                unoptimized={image.url.startsWith("data:")}
                className={`h-56 w-full object-cover transition-opacity duration-300 ${
                  loadedImageIds[image.id] ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => {
                  setLoadedImageIds((prev) => (prev[image.id] ? prev : { ...prev, [image.id]: true }));
                }}
              />
              <button
                type="button"
                className="absolute inset-0 z-10 cursor-zoom-in"
                aria-label="Open image fullscreen"
                onClick={() => {
                  setFullscreenImageUrl(image.url);
                  setFullscreenZoom(1);
                }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs uppercase text-slate-500">{image.kind ?? t("uploadImage").toLowerCase()}</p>
              {(role === "ADMIN" || image.uploadedBy?.id === currentUserId) ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-rose-700 underline"
                  disabled={deletingImageId === image.id}
                  onClick={() => void deleteImage(image.id)}
                >
                  {deletingImageId === image.id ? t("deleteImageBusy") : t("deleteImageAction")}
                </button>
              ) : null}
            </div>
            <p className="text-sm">{image.caption}</p>
            <div className="mt-2 space-y-2 text-sm">
              {image.comments.map((item) => (
                <div key={item.id} className="rounded bg-slate-100 p-2">
                  <strong>{item.user.name}:</strong> {item.text}
                </div>
              ))}
            </div>
            {canCommentOnImages ? (
              <form action={comment} className="mt-3 flex gap-2">
                <input type="hidden" name="imageId" value={image.id} />
                <input className="input" name="text" placeholder={t("writeComment")} required />
                <button className="btn btn-secondary">{t("send")}</button>
              </form>
            ) : (
              <p className="mt-3 text-sm text-amber-700">{t("orderStartRequiredHint")}</p>
            )}
          </div>
        ))}
      </div>

      {hasMoreImages && (
        <div className="flex justify-center">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setVisibleImageCount((prev) => prev + 12)}
          >
            {t("showMoreImages")}
          </button>
        </div>
      )}

      {canWorkerComplete && (
        <form onSubmit={handleCompleteSubmit} className="panel mt-4 rounded border border-slate-200 p-3">
          {usesCompletionChecklist ? (
            <>
              <p className="text-sm font-semibold">{t("workerChecklist")}</p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                <label><input type="checkbox" name="bedReady" /> {formatChecklistLabel("bedReady")}</label>
                <label><input type="checkbox" name="bathroomClean" /> {t("bathroomClean")}</label>
                <label><input type="checkbox" name="kitchenClean" /> {t("kitchenClean")}</label>
                <label><input type="checkbox" name="floorsVacuumed" /> {t("floorsVacuumed")}</label>
                <label><input type="checkbox" name="trashHandled" /> {t("trashHandled")}</label>
                <label><input type="checkbox" name="keysHandled" /> {t("keysHandled")}</label>
                <label><input type="checkbox" name="towelsPrepared" /> {formatChecklistLabel("towelsPrepared")}</label>
                <label><input type="checkbox" name="suppliesRefilled" /> {t("suppliesRefilled")}</label>
                <label><input type="checkbox" name="allRoomsPhotographed" /> {t("allRoomsPhotographed")}</label>
              </div>
            </>
          ) : null}
          <textarea className="input mt-3" name="completionNote" placeholder={t("completionNote")} />
          <button className="btn btn-primary mt-3" disabled={completing} type="submit">
            {completing ? t("sending") : t("completeWithNote")}
          </button>
        </form>
      )}

      {completeConfirmOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-900/45 p-4">
          <div className="mx-auto mt-20 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">{t("completeConfirmTitle")}</h3>
            <p className="mt-2 text-sm text-slate-600">{t("completeConfirmMessage")}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCompleteConfirmOpen(false);
                  setPendingCompletionFormData(null);
                }}
              >
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => void confirmCompleteSubmit()} disabled={completing}>
                {completing ? t("sending") : t("completeWithNote")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {fullscreenImageUrl ? (
        <div className="fixed inset-0 z-[90] bg-black/90 p-3 sm:p-6" onClick={closeFullscreenImage}>
          <div className="mx-auto flex h-full w-full max-w-6xl flex-col" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-900"
                  onClick={() => setFullscreenZoom((prev) => Math.max(1, Number((prev - 0.25).toFixed(2))))}
                >
                  -
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-900"
                  onClick={() => setFullscreenZoom(1)}
                >
                  100%
                </button>
                <button
                  type="button"
                  className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-900"
                  onClick={() => setFullscreenZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))))}
                >
                  +
                </button>
              </div>
              <button type="button" className="rounded-md bg-white px-3 py-1 text-sm font-semibold text-slate-900" onClick={closeFullscreenImage}>
                {t("cancel")}
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-lg border border-white/20 bg-black">
              <div className="flex min-h-full min-w-full items-center justify-center p-2">
                <div style={{ transform: `scale(${fullscreenZoom})`, transformOrigin: "center center" }}>
                  <img
                    src={fullscreenImageUrl}
                    alt="Order image fullscreen"
                    className="max-h-[82vh] max-w-full select-none object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
