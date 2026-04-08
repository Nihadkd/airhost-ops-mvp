"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { toUserErrorMessage } from "@/lib/client-error";

export default function RegisterPage() {
  const router = useRouter();
  const { status } = useSession();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { lang, setLang, t } = useLanguage();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [router, status]);

  const submit = async (formData: FormData) => {
    setError("");
    setSuccess("");
    setLoading(true);
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      phone: String(formData.get("phone")),
      password: String(formData.get("password")),
      acceptedTerms: formData.get("acceptedTerms") === "on",
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setLoading(false);
      setError(await toUserErrorMessage(res, t, "cannotRegister"));
      return;
    }

    setSuccess(t("registerVerifyEmailSent"));
    setLoading(false);
  };

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <div className="mb-3 flex justify-end">
        <select className="input max-w-24" value={lang} onChange={(e) => setLang(e.target.value as "no" | "en")}>
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
      </div>
      <h1 className="text-2xl font-bold">{t("registerAccount")}</h1>
      <form action={submit} className="mt-4 space-y-3">
        <input className="input" type="text" name="name" placeholder={t("name")} required />
        <input className="input" type="email" name="email" placeholder={t("email")} required />
        <input className="input" type="tel" name="phone" placeholder={t("phone")} required />
        <div className="space-y-2">
          <input className="input" type={showPassword ? "text" : "password"} name="password" placeholder={t("passwordMin")} required />
          <button type="button" className="text-sm text-teal-700 underline" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? t("hidePassword") : t("showPassword")}
          </button>
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <input className="mt-0.5" type="checkbox" name="acceptedTerms" required />
          <span>
            Jeg godtar{" "}
            <Link href="/terms" className="font-semibold underline">
              vilkarene
            </Link>{" "}
            og{" "}
            <Link href="/privacy" className="font-semibold underline">
              personvernerklaringen
            </Link>
            . Jeg forstar at avtaler og betaling for oppdrag opprettet i ServNest skal gjennomfores i appen.
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success ? (
          <p
            role="status"
            aria-live="polite"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {success}
          </p>
        ) : null}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "..." : t("register")}
        </button>
      </form>
      <p className="mt-3 text-sm">
        {t("alreadyAccount")} <Link href="/login" className="text-teal-700 underline">{t("login")}</Link>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        <Link href="/privacy" className="underline">Personvern</Link> ·{" "}
        <Link href="/terms" className="underline">Vilkår</Link> ·{" "}
        <Link href="/support" className="underline">Support</Link>
      </p>
    </main>
  );
}
