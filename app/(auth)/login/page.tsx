"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { lang, setLang, t } = useLanguage();

  const submit = async (formData: FormData) => {
    setError("");
    setLoading(true);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const res = await signIn("credentials", { email, password, redirect: false });
    if (!res?.ok) {
      setLoading(false);
      if (res?.error === "CredentialsSignin") {
        setError(t("invalidCredentials"));
        return;
      }
      setError(t("loginUnknownError"));
      return;
    }
    if (res?.error) {
      setLoading(false);
      setError(t("invalidCredentials"));
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <div className="mb-3 flex justify-end">
        <select className="input max-w-24" value={lang} onChange={(e) => setLang(e.target.value as "no" | "en")}>
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
      </div>
      <h1 className="text-2xl font-bold">{t("login")}</h1>
      <p className="text-sm text-slate-600">{t("loginSubtitle")}</p>
      <form action={submit} className="mt-4 space-y-3">
        <input className="input" type="email" name="email" placeholder={t("email")} required />
        <div className="space-y-2">
          <input className="input" type={showPassword ? "text" : "password"} name="password" placeholder={t("password")} required />
          <button type="button" className="text-sm text-teal-700 underline" onClick={() => setShowPassword((prev) => !prev)}>
            {showPassword ? t("hidePassword") : t("showPassword")}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "..." : t("login")}
        </button>
      </form>
      <p className="mt-3 text-sm">
        {t("noAccount")} <Link href="/register" className="text-teal-700 underline">{t("register")}</Link>
      </p>
    </main>
  );
}
