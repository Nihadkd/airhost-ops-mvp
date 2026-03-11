"use client";

import { useLanguage } from "@/lib/language-context";
import { PricesCalculator } from "@/components/prices-calculator";

export function PricesPageContent() {
  const { t } = useLanguage();

  return (
    <section className="space-y-4">
      <PricesCalculator />

      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 shadow-sm ring-1 ring-amber-200">
        <h1 className="text-2xl font-bold text-slate-900">{t("pricePackageTitle")}</h1>

        <h2 className="mt-5 text-lg font-semibold text-slate-900">{t("pricePackageCleaningTitle")}</h2>
        <p className="mt-1 text-sm text-slate-800">{t("pricePackageCleaningWeekday")}</p>
        <p className="text-sm text-slate-800">{t("pricePackageCleaningWeekend")}</p>

        <h2 className="mt-5 text-lg font-semibold text-slate-900">{t("pricePackageKeyDeliveryTitle")}</h2>
        <p className="mt-1 text-sm text-slate-800">{t("pricePackageKeyBefore18")}</p>
        <p className="text-sm text-slate-800">{t("pricePackageKeyAfter18Weekend")}</p>

        <h2 className="mt-5 text-lg font-semibold text-slate-900">{t("pricePackageLaundryTitle")}</h2>
        <p className="mt-1 text-sm text-slate-800">{t("pricePackageLaundryLine")}</p>

        <p className="mt-5 text-sm text-slate-800">{t("priceApartmentLimit")}</p>
        <p className="text-sm text-slate-800">{t("priceAreaAddition")}</p>
        <p className="mt-4 text-sm text-slate-800">{t("priceSuppliesInfo")}</p>
      </div>

      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 shadow-sm ring-1 ring-amber-200">
        <h2 className="text-2xl font-bold text-slate-900">{t("priceSingleTitle")}</h2>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t("priceSingleCleaningTitle")}</h3>
        <p className="mt-1 text-sm text-slate-800">{t("priceSingleCleaningWeekday")}</p>
        <p className="text-sm text-slate-800">{t("priceSingleCleaningWeekend")}</p>
        <p className="mt-2 text-sm text-slate-800">{t("priceSingleCleaningAddition")}</p>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t("priceSingleKeyDeliveryTitle")}</h3>
        <p className="mt-1 text-sm text-slate-800">{t("priceSingleKeyWeekday")}</p>
        <p className="text-sm text-slate-800">{t("priceSingleKeyWeekend")}</p>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t("priceSingleLaundryTitle")}</h3>
        <p className="mt-1 text-sm text-slate-800">{t("priceSingleLaundryLine")}</p>
      </div>

      <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-6 shadow-sm ring-1 ring-amber-200">
        <h2 className="text-2xl font-bold text-slate-900">{t("priceGuestOffersTitle")}</h2>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t("priceBreakfastTitle")}</h3>
        <p className="mt-1 text-sm text-slate-800">{t("priceBreakfastLine")}</p>

        <h3 className="mt-5 text-lg font-semibold text-slate-900">{t("priceClothesLaundryTitle")}</h3>
        <p className="mt-1 text-sm text-slate-800">{t("priceClothesLaundryLine")}</p>
        <p className="text-sm text-slate-800">{t("priceClothesLaundryNote")}</p>
      </div>

      <div className="panel rounded-2xl border border-slate-200 bg-white p-5 text-slate-700 shadow-sm">
        <p className="text-lg font-bold text-slate-900">Kontakt oss</p>
        <div className="mt-3 space-y-1 text-sm">
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-slate-700">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h14.5A1.75 1.75 0 0 1 21 6.75v10.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25V6.75Z" />
                <path d="m4 7 8 6 8-6" />
              </svg>
            </span>
            <a href="mailto:Servn3st@gmail.com" className="font-medium underline">
              Servn3st@gmail.com
            </a>
          </p>
          <p className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-flex h-5 w-5 items-center justify-center text-emerald-600">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path d="M12 2.25a9.75 9.75 0 0 0-8.3 14.87L2.4 21.6l4.63-1.23A9.75 9.75 0 1 0 12 2.25Zm0 17.5a7.7 7.7 0 0 1-3.92-1.07l-.28-.17-2.75.73.74-2.67-.18-.28A7.75 7.75 0 1 1 12 19.75Zm4.27-5.8c-.23-.11-1.37-.68-1.59-.76-.21-.08-.37-.11-.52.12-.15.23-.6.76-.73.92-.13.15-.26.17-.49.06-.23-.12-.96-.35-1.83-1.1-.68-.6-1.14-1.33-1.28-1.56-.13-.23-.01-.35.1-.46.1-.1.23-.26.34-.38.12-.13.15-.22.23-.38.08-.15.04-.29-.02-.4-.06-.12-.52-1.27-.72-1.73-.19-.46-.39-.39-.52-.4h-.45c-.15 0-.4.06-.61.29-.21.23-.8.78-.8 1.9 0 1.12.82 2.2.93 2.35.12.15 1.6 2.45 3.88 3.43.54.23.96.37 1.29.47.54.17 1.03.14 1.42.09.43-.07 1.37-.56 1.56-1.1.19-.54.19-1 .13-1.1-.05-.09-.2-.15-.43-.26Z" />
              </svg>
            </span>
            <a href="tel:+4797391486" className="font-medium underline">
              +47 973 91 486
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
