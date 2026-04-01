"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";
import { toUserErrorMessage } from "@/lib/client-error";
import { getServiceTypeTranslationKey, isGuestCountServiceType, ORDERABLE_SERVICE_TYPES } from "@/lib/service-types";

type LandlordOption = {
  id: string;
  name: string;
  email: string;
};

type PendingImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function createPendingImage(file: File): PendingImage {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function OrderCreateForm({
  canChooseLandlord = false,
  landlordOptions = [],
}: {
  canChooseLandlord?: boolean;
  landlordOptions?: LandlordOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [landlordQuery, setLandlordQuery] = useState("");
  const [selectedType, setSelectedType] = useState("CLEANING");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const pendingImageUrlsRef = useRef<string[]>([]);
  const { t } = useLanguage();
  const landlordChoices = landlordOptions.map((landlord) => ({
    id: landlord.id,
    label: `${landlord.name} (${landlord.email})`,
    name: landlord.name,
    email: landlord.email,
  }));

  useEffect(() => {
    pendingImageUrlsRef.current = pendingImages.map((image) => image.previewUrl);
  }, [pendingImages]);

  useEffect(() => {
    return () => {
      for (const url of pendingImageUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  const clearPendingImages = useCallback(() => {
    setPendingImages((current) => {
      for (const image of current) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return [];
    });
  }, []);

  const removePendingImage = useCallback((imageId: string) => {
    setPendingImages((current) => {
      const image = current.find((item) => item.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }
      return current.filter((item) => item.id !== imageId);
    });
  }, []);

  const resolveLandlordId = (query: string) => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return undefined;

    const exactMatch = landlordChoices.find((landlord) => {
      return (
        landlord.label.toLowerCase() === normalized ||
        landlord.name.toLowerCase() === normalized ||
        landlord.email.toLowerCase() === normalized
      );
    });
    if (exactMatch) return exactMatch.id;

    const partialMatches = landlordChoices.filter((landlord) => {
      return (
        landlord.label.toLowerCase().includes(normalized) ||
        landlord.name.toLowerCase().includes(normalized) ||
        landlord.email.toLowerCase().includes(normalized)
      );
    });

    return partialMatches.length === 1 ? partialMatches[0].id : undefined;
  };

  const isHalfHourSlot = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getMinutes() === 0 || date.getMinutes() === 30;
  };

  const isAirbnbOrder = isGuestCountServiceType(selectedType);

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
      // Keep the original file if compression is unavailable.
    }

    return file;
  }, []);

  const handleImageSelection = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []).filter((file) => file.size > 0 && file.name.trim().length > 0);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const imageFiles = selectedFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== selectedFiles.length) {
      toast.error(t("onlyImagesAllowed"));
    }
    if (imageFiles.length === 0) return;

    setPendingImages((current) => [...current, ...imageFiles.map(createPendingImage)]);
  }, [t]);

  const submit = async (formData: FormData) => {
    const selectedLandlordId = canChooseLandlord ? resolveLandlordId(landlordQuery) : undefined;
    if (canChooseLandlord && !selectedLandlordId) {
      toast.error(t("invalidLandlordSelection"));
      return;
    }

    const datePart = String(formData.get("date"));
    const timePart = String(formData.get("time"));
    const rawDate = `${datePart}T${timePart}`;
    if (!datePart || !timePart || !isHalfHourSlot(rawDate)) {
      toast.error(t("timeSlotHalfHourOnly"));
      return;
    }
    const note = String(formData.get("note") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const requiresJobSummary = !isGuestCountServiceType(String(formData.get("type")));
    if (requiresJobSummary && !note) {
      toast.error(t("jobSummaryRequired"));
      return;
    }
    if (!isAirbnbOrder && !details) {
      toast.error(t("jobDetailsRequired"));
      return;
    }

    let deadlineAt: string | undefined;
    if (!isAirbnbOrder) {
      const deadlineDatePart = String(formData.get("deadlineDate"));
      const deadlineTimePart = String(formData.get("deadlineTime"));
      const rawDeadline = `${deadlineDatePart}T${deadlineTimePart}`;
      if (!deadlineDatePart || !deadlineTimePart || !isHalfHourSlot(rawDeadline)) {
        toast.error(t("timeSlotHalfHourOnly"));
        return;
      }
      const startDate = new Date(rawDate);
      const deadlineDate = new Date(rawDeadline);
      if (deadlineDate.getTime() <= startDate.getTime()) {
        toast.error(t("deadlineAfterStart"));
        return;
      }
      deadlineAt = deadlineDate.toISOString();
    }

    const payload = {
      type: String(formData.get("type")),
      address: String(formData.get("address")),
      date: new Date(rawDate).toISOString(),
      deadlineAt,
      note,
      details: isAirbnbOrder ? undefined : details,
      guestCount: isGuestCountServiceType(String(formData.get("type")))
        ? Number(formData.get("guestCount") || 0) || undefined
        : undefined,
      landlordId: selectedLandlordId,
    };
    const filesToUpload = pendingImages.map((image) => image.file);

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(t("conflictError"));
        } else {
          toast.error(await toUserErrorMessage(res, t, "genericError"));
        }
        return;
      }

      const order = (await res.json()) as { id: string };

      if (filesToUpload.length > 0) {
        const optimizedFiles = await Promise.all(filesToUpload.map((file) => compressImageFile(file)));
        const uploadPayload = new FormData();
        uploadPayload.append("orderId", order.id);
        for (const file of optimizedFiles) {
          uploadPayload.append("files", file);
        }

        const uploadRes = await fetch("/api/images/upload", {
          method: "POST",
          body: uploadPayload,
        });

        if (!uploadRes.ok) {
          toast.success(t("createOrderSuccess"));
          toast.error(await toUserErrorMessage(uploadRes, t, "orderImageUploadFailed"));
          clearPendingImages();
          router.push(`/orders/${order.id}`);
          return;
        }
      }

      clearPendingImages();
      toast.success(t("createOrderSuccess"));
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form action={submit} className="panel mx-auto mt-6 max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold">{t("newOrder")}</h1>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("serviceLabel")}</span>
        <select
          name="type"
          className="input"
          required
          value={selectedType}
          onChange={(event) => setSelectedType(event.target.value)}
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
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">
          {isAirbnbOrder ? t("commentLabel") : t("jobSummaryLabel")}
        </span>
        <textarea
          name="note"
          className="input min-h-24"
          placeholder={isAirbnbOrder ? t("notePlaceholder") : t("jobSummaryPlaceholder")}
          required={!isGuestCountServiceType(selectedType)}
        />
        {!isGuestCountServiceType(selectedType) ? (
          <span className="mt-1 block text-xs font-semibold text-slate-500">{t("jobSummaryHint")}</span>
        ) : null}
      </label>
      {!isAirbnbOrder ? (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t("jobDetailsLabel")}</span>
          <textarea
            name="details"
            className="input min-h-32"
            placeholder={t("jobDetailsPlaceholder")}
            required
          />
          <span className="mt-1 block text-xs font-semibold text-slate-500">{t("jobDetailsHint")}</span>
        </label>
      ) : null}
      {canChooseLandlord && (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t("roleLandlord")}</span>
          <input
            className="input"
            list="landlord-options"
            value={landlordQuery}
            onChange={(event) => setLandlordQuery(event.target.value)}
            placeholder={t("searchLandlord")}
            required
          />
          <datalist id="landlord-options">
            {landlordChoices.map((landlord) => (
              <option key={landlord.id} value={landlord.label} />
            ))}
          </datalist>
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("startDateTimeLabel")}</span>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="date" name="date" className="input" required />
          <select name="time" className="input" defaultValue="" required>
            <option value="" disabled>
              {t("selectTime")}
            </option>
            {TIME_OPTIONS.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>
        <span className="mt-1 block text-xs text-slate-500">{t("timeSlotHalfHourOnly")}</span>
      </label>
      {!isAirbnbOrder ? (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t("deadlineDateTimeLabel")}</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="date" name="deadlineDate" className="input" required />
            <select name="deadlineTime" className="input" defaultValue="" required>
              <option value="" disabled>
                {t("selectTime")}
              </option>
              {TIME_OPTIONS.map((time) => (
                <option key={`deadline-${time}`} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>
          <span className="mt-1 block text-xs text-slate-500">{t("deadlineAfterStartHint")}</span>
        </label>
      ) : null}
      {isGuestCountServiceType(selectedType) ? (
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-slate-900">{t("guestCount")}</span>
          <div className="inline-flex w-[150px] flex-col rounded-md border-2 border-amber-400 bg-amber-50 p-1.5 shadow-sm ring-1 ring-amber-200">
            <span className="mb-1 inline-flex rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-900">
              {t("importantField")}
            </span>
            <input
              type="number"
              min={1}
              max={50}
              name="guestCount"
              className="input h-8 w-[92px] border-amber-400 bg-white text-xs font-semibold"
              required
            />
            <span className="mt-1 block text-xs font-semibold text-amber-900">{t("guestCountHint")}</span>
          </div>
        </label>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("addressLabel")}</span>
        <input type="text" name="address" className="input" required />
      </label>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{t("orderAttachmentsLabel")}</p>
        <p className="mt-1 text-sm text-slate-600">{t("orderAttachmentsHint")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label
            htmlFor="create-order-camera-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M4 7h3l2-2h6l2 2h3v12H4z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>{t("uploadFromCamera")}</span>
          </label>
          <label
            htmlFor="create-order-library-upload"
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65l-9.2 9.19a2 2 0 0 1-2.82-2.82l8.49-8.48" />
            </svg>
            <span>{t("uploadFromLibrary")}</span>
          </label>
        </div>
        <input
          id="create-order-camera-upload"
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelection}
        />
        <input
          id="create-order-library-upload"
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleImageSelection}
        />
        {pendingImages.length > 0 ? (
          <>
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {t("selectedImagesLabel")}: {pendingImages.length}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {pendingImages.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img src={image.previewUrl} alt={image.file.name} className="h-40 w-full object-cover" />
                  <div className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{image.file.name}</p>
                      <p className="text-xs text-slate-500">{Math.max(1, Math.round(image.file.size / 1024))} KB</p>
                    </div>
                    <button
                      type="button"
                      className="text-sm font-semibold text-rose-700 underline"
                      onClick={() => removePendingImage(image.id)}
                    >
                      {t("removeSelectedImageAction")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <button disabled={loading} className="btn btn-primary" type="submit">
        {loading ? t("saving") : t("createOrderAction")}
      </button>
    </form>
  );
}
