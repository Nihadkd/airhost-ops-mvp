"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type CleaningOption = "none" | "packageWeekday" | "packageWeekend" | "singleWeekday" | "singleWeekend";
type KeyOption = "none" | "packageBefore18" | "packageAfter18Weekend" | "singleWeekday" | "singleWeekend";

const cleaningPrices: Record<Exclude<CleaningOption, "none">, number> = {
  packageWeekday: 500,
  packageWeekend: 600,
  singleWeekday: 600,
  singleWeekend: 700,
};

const keyPrices: Record<Exclude<KeyOption, "none">, number> = {
  packageBefore18: 400,
  packageAfter18Weekend: 500,
  singleWeekday: 500,
  singleWeekend: 700,
};

const cleaningPackageToSingle: Record<Extract<CleaningOption, "packageWeekday" | "packageWeekend">, Exclude<CleaningOption, "none" | "packageWeekday" | "packageWeekend">> =
  {
    packageWeekday: "singleWeekday",
    packageWeekend: "singleWeekend",
  };

const keyPackageToSingle: Record<Extract<KeyOption, "packageBefore18" | "packageAfter18Weekend">, Exclude<KeyOption, "none" | "packageBefore18" | "packageAfter18Weekend">> =
  {
    packageBefore18: "singleWeekday",
    packageAfter18Weekend: "singleWeekend",
  };

function formatNok(amount: number) {
  return `${Math.max(0, Math.round(amount)).toLocaleString("nb-NO")} kr`;
}

function calculateAreaSurcharge(areaSqm: number, hasCleaning: boolean) {
  if (!hasCleaning || areaSqm <= 50) return 0;
  return Math.ceil((areaSqm - 50) / 25) * 100;
}

function parseOptionalNumber(value: string) {
  if (value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function PricesCalculator() {
  const { t } = useLanguage();
  const [cleaning, setCleaning] = useState<CleaningOption>("none");
  const [keyDelivery, setKeyDelivery] = useState<KeyOption>("none");
  const [areaSqmInput, setAreaSqmInput] = useState("");
  const [linenKgInput, setLinenKgInput] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const areaSqm = parseOptionalNumber(areaSqmInput);
  const linenKg = parseOptionalNumber(linenKgInput);

  const packageCleaningSelected = cleaning === "packageWeekday" || cleaning === "packageWeekend";
  const packageKeySelected = keyDelivery === "packageBefore18" || keyDelivery === "packageAfter18Weekend";
  const washSelected = linenKg > 0;
  const fullPackageSelected = packageCleaningSelected && packageKeySelected && washSelected;
  const activeLinenRate = fullPackageSelected ? 60 : 65;

  const breakdown = useMemo(() => {
    const lines: Array<{ label: string; amount: number }> = [];

    if (cleaning !== "none") {
      const labelMap: Record<Exclude<CleaningOption, "none">, string> = {
        packageWeekday: t("pricePackageCleaningWeekdayLabel"),
        packageWeekend: t("pricePackageCleaningWeekendLabel"),
        singleWeekday: t("priceSingleCleaningWeekdayLabel"),
        singleWeekend: t("priceSingleCleaningWeekendLabel"),
      };
      if ((cleaning === "packageWeekday" || cleaning === "packageWeekend") && !fullPackageSelected) {
        const fallback = cleaningPackageToSingle[cleaning];
        lines.push({ label: labelMap[fallback], amount: cleaningPrices[fallback] });
      } else {
        lines.push({ label: labelMap[cleaning], amount: cleaningPrices[cleaning] });
      }
    }

    if (keyDelivery !== "none") {
      const labelMap: Record<Exclude<KeyOption, "none">, string> = {
        packageBefore18: t("pricePackageKeyBefore18Label"),
        packageAfter18Weekend: t("pricePackageKeyAfter18WeekendLabel"),
        singleWeekday: t("priceSingleKeyWeekdayLabel"),
        singleWeekend: t("priceSingleKeyWeekendLabel"),
      };
      if ((keyDelivery === "packageBefore18" || keyDelivery === "packageAfter18Weekend") && !fullPackageSelected) {
        const fallback = keyPackageToSingle[keyDelivery];
        lines.push({ label: labelMap[fallback], amount: keyPrices[fallback] });
      } else {
        lines.push({ label: labelMap[keyDelivery], amount: keyPrices[keyDelivery] });
      }
    }

    if (linenKg > 0) {
      lines.push({
        label: `${t("priceSingleLaundryTitle")} (${linenKg} kg x ${activeLinenRate} kr)`,
        amount: activeLinenRate * linenKg,
      });
    }

    const surcharge = calculateAreaSurcharge(areaSqm, cleaning !== "none");
    if (surcharge > 0) {
      lines.push({ label: `${t("priceCalcAreaSurcharge")} (${areaSqm} m²)`, amount: surcharge });
    }

    return {
      lines,
      total: lines.reduce((sum, line) => sum + line.amount, 0),
    };
  }, [activeLinenRate, areaSqm, cleaning, fullPackageSelected, keyDelivery, linenKg, t]);

  const hasValidArea = areaSqmInput.trim() !== "" && areaSqm > 0;
  const hasValidLaundryWeight = linenKg === 0 || linenKg >= 5;
  const hasPricedSelection = breakdown.total > 0;
  const canSubmitOrder = hasPricedSelection && hasValidArea && hasValidLaundryWeight;

  const selectedCleaningLabel =
    cleaning === "none"
      ? t("priceCalcNotSelected")
      : cleaning === "packageWeekday"
        ? t("pricePackageCleaningWeekday")
        : cleaning === "packageWeekend"
          ? t("pricePackageCleaningWeekend")
          : cleaning === "singleWeekday"
            ? t("priceSingleCleaningWeekday")
            : t("priceSingleCleaningWeekend");

  const selectedKeyLabel =
    keyDelivery === "none"
      ? t("priceCalcNotSelected")
      : keyDelivery === "packageBefore18"
        ? t("pricePackageKeyBefore18")
        : keyDelivery === "packageAfter18Weekend"
          ? t("pricePackageKeyAfter18Weekend")
          : keyDelivery === "singleWeekday"
            ? t("priceSingleKeyWeekday")
            : t("priceSingleKeyWeekend");

  const submitOrder = () => {
    setSubmitAttempted(true);
    if (!hasValidArea || !hasValidLaundryWeight) return;
    toast.success(t("priceCalcOrderSubmittedToast"));
    setConfirmOpen(false);
  };

  return (
    <div className="rounded-2xl border-2 border-teal-400 bg-teal-50 p-6 shadow-sm ring-1 ring-teal-200">
      <h2 className="text-2xl font-bold text-slate-900">{t("priceCalcTitle")}</h2>
      <p className="mt-1 text-sm text-slate-700">{t("priceCalcSubtitle")}</p>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-800">{t("priceCalcCleaning")}</span>
          <select className="input" value={cleaning} onChange={(e) => setCleaning(e.target.value as CleaningOption)}>
            <option value="none">{t("priceCalcNotSelected")}</option>
            <option value="packageWeekday">{t("pricePackageCleaningWeekday")}</option>
            <option value="packageWeekend">{t("pricePackageCleaningWeekend")}</option>
            <option value="singleWeekday">{t("priceSingleCleaningWeekday")}</option>
            <option value="singleWeekend">{t("priceSingleCleaningWeekend")}</option>
          </select>
        </label>

        <label className="text-sm">
          <span className={`mb-1 block font-semibold ${submitAttempted && !hasValidArea ? "text-red-700" : "text-slate-800"}`}>
            {t("priceCalcHomeSize")}
          </span>
          <input
            className={`input ${submitAttempted && !hasValidArea ? "border-red-500 text-red-700 ring-1 ring-red-300" : ""}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={areaSqmInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === "" || /^\d+$/.test(nextValue)) {
                setAreaSqmInput(nextValue);
              }
            }}
          />
          {submitAttempted && !hasValidArea ? (
            <span className="mt-1 block text-xs font-semibold text-red-700">{t("priceCalcHomeSizeRequired")}</span>
          ) : null}
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-800">{t("priceCalcKeyDelivery")}</span>
          <select className="input" value={keyDelivery} onChange={(e) => setKeyDelivery(e.target.value as KeyOption)}>
            <option value="none">{t("priceCalcNotSelected")}</option>
            <option value="packageBefore18">{t("pricePackageKeyBefore18")}</option>
            <option value="packageAfter18Weekend">{t("pricePackageKeyAfter18Weekend")}</option>
            <option value="singleWeekday">{t("priceSingleKeyWeekday")}</option>
            <option value="singleWeekend">{t("priceSingleKeyWeekend")}</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-1 block font-semibold text-slate-800">{t("priceCalcLaundryWeight")}</span>
          <input
            className={`input ${submitAttempted && !hasValidLaundryWeight ? "border-red-500 text-red-700 ring-1 ring-red-300" : ""}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="0"
            value={linenKgInput}
            onChange={(e) => {
              const nextValue = e.target.value;
              if (nextValue === "" || /^\d+$/.test(nextValue)) {
                setLinenKgInput(nextValue);
              }
            }}
          />
          {submitAttempted && !hasValidLaundryWeight ? (
            <span className="mt-1 block text-xs font-semibold text-red-700">{t("priceCalcLaundryMinRequired")}</span>
          ) : null}
          <span className="mt-1 block text-xs text-slate-600">
            {t("priceCalcActiveKgPrice")}: {activeLinenRate} kr/kg
          </span>
        </label>

      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-base font-semibold text-slate-900">{t("priceCalcDetails")}</h3>
        {breakdown.lines.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">{t("priceCalcNotSelected")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {breakdown.lines.map((line) => (
              <li key={line.label} className="flex items-center justify-between gap-4">
                <span>{line.label}</span>
                <strong>{formatNok(line.amount)}</strong>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
          <span className="font-semibold text-slate-900">{t("priceCalcTotal")}</span>
          <span className="text-xl font-extrabold text-amber-900">{formatNok(breakdown.total)}</span>
        </div>
        <p className="mt-2 text-xs text-slate-600">{t("priceCalcPaymentInfo")}</p>
        <button
          type="button"
          className="btn btn-primary mt-4 w-full md:w-auto"
          disabled={!hasPricedSelection}
          onClick={() => {
            setSubmitAttempted(true);
            if (!hasValidArea || !hasValidLaundryWeight) return;
            setConfirmOpen(true);
          }}
        >
          {t("priceCalcSubmitOrder")}
        </button>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-[80] bg-slate-900/45 p-4">
          <div className="mx-auto mt-16 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">{t("priceCalcSubmitOrder")}</h3>
            <p className="mt-1 text-sm text-slate-600">{t("priceCalcOverviewSubtitle")}</p>

            <div className="mt-4 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">{t("priceCalcCleaning")}</span>
                <span className="text-slate-900">{selectedCleaningLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">{t("priceCalcHomeSize")}</span>
                <span className="text-slate-900">{areaSqmInput.trim() === "" ? "0" : areaSqmInput} m²</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">{t("priceCalcKeyDelivery")}</span>
                <span className="text-slate-900">{selectedKeyLabel}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold text-slate-700">{t("priceCalcLaundryWeight")}</span>
                <span className="text-slate-900">{linenKgInput.trim() === "" ? "0" : linenKgInput} kg</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t("priceCalcDetails")}</p>
              {breakdown.lines.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">{t("priceCalcNotSelected")}</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  {breakdown.lines.map((line) => (
                    <li key={line.label} className="flex items-center justify-between gap-4">
                      <span>{line.label}</span>
                      <strong>{formatNok(line.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2">
                <span className="font-semibold text-slate-900">{t("priceCalcTotal")}</span>
                <span className="text-2xl font-extrabold text-amber-900">{formatNok(breakdown.total)}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>
                {t("cancel")}
              </button>
              <button type="button" className="btn btn-primary" disabled={!canSubmitOrder} onClick={submitOrder}>
                {t("priceCalcSubmitOrder")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
