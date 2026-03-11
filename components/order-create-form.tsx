"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";
import { toUserErrorMessage } from "@/lib/client-error";

type LandlordOption = {
  id: string;
  name: string;
  email: string;
};

const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hours = String(Math.floor(index / 2)).padStart(2, "0");
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

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
  const { t } = useLanguage();
  const landlordChoices = landlordOptions.map((landlord) => ({
    id: landlord.id,
    label: `${landlord.name} (${landlord.email})`,
    name: landlord.name,
    email: landlord.email,
  }));
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

  const submit = async (formData: FormData) => {
    const selectedLandlordId = canChooseLandlord
      ? resolveLandlordId(landlordQuery)
      : undefined;
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

    setLoading(true);
    const payload = {
      type: String(formData.get("type")),
      address: String(formData.get("address")),
      date: new Date(rawDate).toISOString(),
      deadlineAt: deadlineDate.toISOString(),
      note: String(formData.get("note") || ""),
      guestCount: Number(formData.get("guestCount") || 0) || undefined,
      landlordId: selectedLandlordId,
    };

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      if (res.status === 409) {
        toast.error(t("conflictError"));
      } else {
        toast.error(await toUserErrorMessage(res, t, "genericError"));
      }
      return;
    }

    toast.success(t("createOrderSuccess"));
    router.push("/dashboard");
  };

  return (
    <form action={submit} className="panel mx-auto mt-6 max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold">{t("newOrder")}</h1>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("serviceLabel")}</span>
        <select name="type" className="input" required>
          <option value="CLEANING">{t("serviceCleaningName")}</option>
          <option value="KEY_HANDLING">{t("serviceKeyHandlingName")}</option>
        </select>
      </label>
      {canChooseLandlord && (
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t("roleLandlord")}</span>
          <input
            className="input"
            list="landlord-options"
            value={landlordQuery}
            onChange={(e) => setLandlordQuery(e.target.value)}
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
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("addressLabel")}</span>
        <input type="text" name="address" className="input" required />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-slate-600">{t("commentLabel")}</span>
        <textarea name="note" className="input min-h-28" />
      </label>
      <button disabled={loading} className="btn btn-primary" type="submit">
        {loading ? t("saving") : t("createOrderAction")}
      </button>
    </form>
  );
}
