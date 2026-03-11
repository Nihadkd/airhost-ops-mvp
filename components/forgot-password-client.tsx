"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { toUserErrorMessage } from "@/lib/client-error";

export function ForgotPasswordClient({ token }: { token: string }) {
  const { lang, setLang, t } = useLanguage();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const sendResetEmail = async (formData: FormData) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const res = await fetch("/api/auth/reset-password/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setError(await toUserErrorMessage(res, t, "resetPasswordFailed"));
        setLoading(false);
        return;
      }
      setSuccess(t("resetPasswordEmailSent"));
    } catch {
      setError(t("resetPasswordFailed"));
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async (formData: FormData) => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const password = String(formData.get("password") ?? "");
      const res = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        setError(await toUserErrorMessage(res, t, "resetPasswordFailed"));
        setLoading(false);
        return;
      }
      setSuccess(t("resetPasswordSuccess"));
    } catch {
      setError(t("resetPasswordFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <div className="mb-3 flex justify-end">
        <select className="input max-w-24" value={lang} onChange={(e) => setLang(e.target.value as "no" | "en")}>
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
      </div>
      <h1 className="text-2xl font-bold">{t("resetPassword")}</h1>
      <p className="text-sm text-slate-600">{token ? t("resetPasswordSetNewSubtitle") : t("resetPasswordEmailSubtitle")}</p>

      {!token ? (
        <form action={sendResetEmail} className="mt-4 space-y-3">
          <input
            className="input"
            type="email"
            name="email"
            placeholder={t("email")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-teal-700">{success}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "..." : t("send")}
          </button>
        </form>
      ) : (
        <form action={submitNewPassword} className="mt-4 space-y-3">
          <input
            className="input"
            type="password"
            name="password"
            placeholder={t("newPassword")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            minLength={8}
            required
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-teal-700">{success}</p>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "..." : t("resetPassword")}
          </button>
        </form>
      )}

      <p className="mt-3 text-sm">
        <Link href="/login" className="text-teal-700 underline">
          {t("backToLogin")}
        </Link>
      </p>
    </main>
  );
}
