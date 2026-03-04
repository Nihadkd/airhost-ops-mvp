"use client";

import { useMemo, useState } from "react";
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

function formatNok(amount: number) {
  return `${Math.max(0, Math.round(amount)).toLocaleString("nb-NO")} kr`;
}

function calculateAreaSurcharge(areaSqm: number, hasCleaning: boolean) {
  if (!hasCleaning || areaSqm <= 75) return 0;
  return Math.ceil((areaSqm - 75) / 25) * 100;
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

  const areaSqm = parseOptionalNumber(areaSqmInput);
  const linenKg = parseOptionalNumber(linenKgInput);

  const packageCleaningSelected = cleaning === "packageWeekday" || cleaning === "packageWeekend";
  const packageKeySelected = keyDelivery === "packageBefore18" || keyDelivery === "packageAfter18Weekend";
  const activeLinenRate = packageCleaningSelected && packageKeySelected ? 60 : 65;

  const breakdown = useMemo(() => {
    const lines: Array<{ label: string; amount: number }> = [];

    if (cleaning !== "none") {
      const labelMap: Record<Exclude<CleaningOption, "none">, string> = {
        packageWeekday: t("pricePackageCleaningWeekdayLabel"),
        packageWeekend: t("pricePackageCleaningWeekendLabel"),
        singleWeekday: t("priceSingleCleaningWeekdayLabel"),
        singleWeekend: t("priceSingleCleaningWeekendLabel"),
      };
      lines.push({ label: labelMap[cleaning], amount: cleaningPrices[cleaning] });
    }

    if (keyDelivery !== "none") {
      const labelMap: Record<Exclude<KeyOption, "none">, string> = {
        packageBefore18: t("pricePackageKeyBefore18Label"),
        packageAfter18Weekend: t("pricePackageKeyAfter18WeekendLabel"),
        singleWeekday: t("priceSingleKeyWeekdayLabel"),
        singleWeekend: t("priceSingleKeyWeekendLabel"),
      };
      lines.push({ label: labelMap[keyDelivery], amount: keyPrices[keyDelivery] });
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
  }, [activeLinenRate, areaSqm, cleaning, keyDelivery, linenKg, t]);

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
          <span className="mb-1 block font-semibold text-slate-800">{t("priceCalcHomeSize")}</span>
          <input
            className="input"
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
            className="input"
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
      </div>
    </div>
  );
}
