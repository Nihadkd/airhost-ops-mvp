"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/language-context";

type Me = {
  name: string;
  email: string;
  phone?: string | null;
  accountRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  canLandlord: boolean;
  canService: boolean;
  activeMode: "UTLEIER" | "TJENESTE";
  effectiveRole: "ADMIN" | "UTLEIER" | "TJENESTE";
  adminViewMode: "ADMIN" | "UTLEIER" | "TJENESTE";
};

export function ProfileClient({ initialMe }: { initialMe: Me }) {
  const [me, setMe] = useState<Me>(initialMe);
  const [switching, setSwitching] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: initialMe.name,
    phone: initialMe.phone ?? "",
  });
  const { t } = useLanguage();

  const access = [me.canLandlord ? t("roleLandlord") : "", me.canService ? t("roleWorker") : ""]
    .filter(Boolean)
    .join(" / ");

  useEffect(() => {
    let mounted = true;
    const loadProfile = async () => {
      const res = await fetch("/api/users/me", { cache: "no-store" });
      if (!res.ok || !mounted) return;
      const data = (await res.json()) as Me;
      setMe(data);
      setProfileForm({ name: data.name, phone: data.phone ?? "" });
    };
    void loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const switchMode = async (mode: "ADMIN" | "UTLEIER" | "TJENESTE") => {
    setSwitching(true);
    const previous = me;
    setMe((prev) => ({
      ...prev,
      adminViewMode: mode,
      activeMode: mode === "TJENESTE" ? "TJENESTE" : "UTLEIER",
      effectiveRole: mode,
    }));

    const res = await fetch("/api/users/me/mode", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });

    if (!res.ok) {
      setMe(previous);
      toast.error(t("profileSwitchFailed"));
      setSwitching(false);
      return;
    }

    setMe(await res.json());

    toast.success(t("profileModeUpdated"));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("mode-changed"));
    }
    setSwitching(false);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    const res = await fetch("/api/users/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone }),
    });
    setSavingProfile(false);

    if (!res.ok) {
      toast.error(t("profileUpdateFailed"));
      return;
    }

    const updated = (await res.json()) as Me;
    setMe(updated);
    setProfileForm({ name: updated.name, phone: updated.phone ?? "" });
    toast.success(t("profileUpdated"));
  };

  const deleteMyAccount = async () => {
    const confirmed = window.confirm(t("confirmDeleteMyAccount"));
    if (!confirmed) return;
    setDeletingProfile(true);
    const res = await fetch("/api/users/me", { method: "DELETE" });
    setDeletingProfile(false);

    if (!res.ok) {
      toast.error(t("deleteAccountFailed"));
      return;
    }

    toast.success(t("deleteAccountSuccess"));
    await signOut({ callbackUrl: "/login" });
  };

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h1 className="text-2xl font-bold">{t("profileTitle")}</h1>
        <p className="text-sm text-slate-600">
          {me.name} - {me.email}
        </p>
      </div>

      <div className="panel space-y-3 p-5">
        <p>
          <strong>{t("activeMode")}:</strong> {me.accountRole === "ADMIN" ? me.adminViewMode : me.activeMode}
        </p>
        <p>
          <strong>{t("access")}:</strong> {access}
        </p>
        {me.accountRole === "ADMIN" ? (
          <div className="max-w-sm">
            <label className="mb-1 block text-sm">{t("switchView")}</label>
            <select
              className="input"
              disabled={switching}
              value={me.adminViewMode}
              onChange={(e) => void switchMode(e.target.value as "ADMIN" | "UTLEIER" | "TJENESTE")}
            >
              <option value="ADMIN">{t("viewAsAdmin")}</option>
              <option value="UTLEIER">{t("viewAsLandlord")}</option>
              <option value="TJENESTE">{t("viewAsWorker")}</option>
            </select>
          </div>
        ) : (
          <div className="max-w-sm">
            <label className="mb-1 block text-sm">{t("switchView")}</label>
            <select
              className="input"
              disabled={switching}
              value={me.activeMode}
              onChange={(e) => void switchMode(e.target.value as "UTLEIER" | "TJENESTE")}
            >
              <option value="UTLEIER">{t("viewAsLandlord")}</option>
              <option value="TJENESTE">{t("viewAsWorker")}</option>
            </select>
          </div>
        )}
      </div>

      <div className="panel space-y-3 p-5">
        <p className="text-sm font-semibold">{t("profileEditSection")}</p>
        <div className="max-w-md space-y-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{t("name")}</span>
            <input
              className="input"
              value={profileForm.name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{t("phone")}</span>
            <input
              className="input"
              value={profileForm.phone}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </label>
          <button className="btn btn-primary" type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
            {savingProfile ? t("saving") : t("saveProfile")}
          </button>
        </div>
      </div>

      <div className="panel space-y-2 border border-rose-200 bg-rose-50 p-5">
        <p className="text-sm font-semibold text-rose-900">{t("dangerZone")}</p>
        <p className="text-sm text-rose-800">{t("deleteAccountHint")}</p>
        <button className="btn btn-danger w-fit" type="button" onClick={() => void deleteMyAccount()} disabled={deletingProfile}>
          {deletingProfile ? t("saving") : t("deleteMyAccount")}
        </button>
      </div>
    </section>
  );
}

