"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type Me = {
  activeMode: "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  mobileNotifications: boolean;
};

type PushStatus = {
  mobileNotifications: boolean;
  activeTokenCount: number;
  latestTokenAt: string | null;
  devices: Array<{
    platform: string;
    deviceName: string | null;
    isActive: boolean;
    updatedAt: string;
    createdAt: string;
    tokenPreview: string;
  }>;
};

export function SettingsClient() {
  const { t, lang, setLang } = useLanguage();
  const [me, setMe] = useState<Me | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [saving, setSaving] = useState(false);
  const [testingPush, setTestingPush] = useState(false);

  const loadPushStatus = async () => {
    const res = await fetch("/api/users/me/push-status", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as PushStatus;
    setPushStatus(data);
  };

  useEffect(() => {
    const load = async () => {
      const [meRes, pushRes] = await Promise.all([
        fetch("/api/users/me", { cache: "no-store" }),
        fetch("/api/users/me/push-status", { cache: "no-store" }),
      ]);
      if (meRes.ok) {
        const data = (await meRes.json()) as Me;
        setMe(data);
      }
      if (pushRes.ok) {
        const pushData = (await pushRes.json()) as PushStatus;
        setPushStatus(pushData);
      }
    };
    void load();
  }, []);

  const saveMobileNotification = async (next: boolean) => {
    setSaving(true);
    const res = await fetch("/api/users/me/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobileNotifications: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(t("settingsSaveFailed"));
      return;
    }
    setMe((prev) => (prev ? { ...prev, mobileNotifications: next } : prev));
    await loadPushStatus();
    toast.success(t("settingsSaved"));
  };

  const switchMode = async (mode: "UTLEIER" | "TJENESTE") => {
    if (!me) return;
    setSaving(true);
    const res = await fetch("/api/users/me/mode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(t("switchModeFailed"));
      return;
    }
    const data = (await res.json()) as Me;
    setMe(data);
    toast.success(t("switchModeUpdated"));
    window.dispatchEvent(new Event("mode-changed"));
  };

  const sendTestPush = async () => {
    setTestingPush(true);
    const res = await fetch("/api/users/me/test-push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    setTestingPush(false);
    const data = (await res.json().catch(() => null)) as
      | {
          ok?: boolean;
          delivery?: { reason?: string; tokenCount?: number; errors?: string[] };
          error?: string;
        }
      | null;

    await loadPushStatus();

    if (!res.ok || !data) {
      toast.error(t("pushTestFailed"));
      return;
    }

    if (data.ok) {
      toast.success(t("pushTestSent"));
      return;
    }

    const reason = data.delivery?.reason;
    if (reason === "mobile_notifications_disabled") {
      toast.error(t("pushDisabled"));
      return;
    }
    if (reason === "no_active_tokens") {
      toast.error(t("pushNoActiveTokens"));
      return;
    }

    toast.error(data.delivery?.errors?.[0] ?? data.error ?? t("pushTestFailed"));
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="text-sm text-slate-600">{t("settingsHint")}</p>
      </div>

      <div className="panel space-y-4 p-5">
        <label className="block">
          <span className="mb-1 block text-sm text-slate-600">{t("language")}</span>
          <select className="input max-w-xs" value={lang} onChange={(e) => setLang(e.target.value as "no" | "en")}>
            <option value="no">Norsk</option>
            <option value="en">English</option>
          </select>
        </label>

        {me?.effectiveRole !== "ADMIN" && (
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{t("activeMode")}</span>
            <select
              className="input max-w-xs"
              value={me?.activeMode ?? "UTLEIER"}
              disabled={saving}
              onChange={(e) => void switchMode(e.target.value as "UTLEIER" | "TJENESTE")}
            >
              <option value="UTLEIER">{t("viewAsLandlord")}</option>
              <option value="TJENESTE">{t("viewAsWorker")}</option>
            </select>
          </label>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!me?.mobileNotifications}
            disabled={saving}
            onChange={(e) => void saveMobileNotification(e.target.checked)}
          />
          {t("mobileNotifications")}
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">{t("pushStatusTitle")}</p>
              <p className="text-slate-600">
                {pushStatus?.activeTokenCount
                  ? `${t("pushActiveDevices")}: ${pushStatus.activeTokenCount}`
                  : t("pushNoActiveTokens")}
              </p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => void sendTestPush()} disabled={testingPush}>
              {testingPush ? t("sending") : t("sendTestPush")}
            </button>
          </div>

          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <p>
              {t("pushPreference")}: {pushStatus?.mobileNotifications ? t("userActive") : t("userInactive")}
            </p>
            <p>
              {t("pushLatestSync")}:{" "}
              {pushStatus?.latestTokenAt ? new Date(pushStatus.latestTokenAt).toLocaleString(lang === "no" ? "nb-NO" : "en-GB") : t("noDataYet")}
            </p>
            {pushStatus?.devices.map((device) => (
              <div key={`${device.tokenPreview}-${device.updatedAt}`} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                <p className="font-medium text-slate-800">
                  {device.platform.toUpperCase()}
                  {device.deviceName ? ` · ${device.deviceName}` : ""}
                </p>
                <p>{device.tokenPreview}</p>
                <p>
                  {device.isActive ? t("userActive") : t("userInactive")} ·{" "}
                  {new Date(device.updatedAt).toLocaleString(lang === "no" ? "nb-NO" : "en-GB")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-sm text-slate-600">
          <Link href="/privacy" className="underline">{t("privacyLabel")}</Link>{" · "}
          <Link href="/terms" className="underline">{t("termsLabel")}</Link>{" · "}
          <Link href="/support" className="underline">{t("supportLabel")}</Link>
        </div>
      </div>
    </section>
  );
}

