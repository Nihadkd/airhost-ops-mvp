"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const { lang, setLang, t } = useLanguage();

  const submit = async (formData: FormData) => {
    setError("");
    const payload = {
      name: String(formData.get("name")),
      email: String(formData.get("email")),
      password: String(formData.get("password")),
      role: String(formData.get("role") || "UTLEIER"),
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      setError(t("cannotRegister"));
      return;
    }

    await signIn("credentials", { email: payload.email, password: payload.password, redirect: false });
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
      <h1 className="text-2xl font-bold">{t("registerAccount")}</h1>
      <form action={submit} className="mt-4 space-y-3">
        <input className="input" type="text" name="name" placeholder={t("name")} required />
        <input className="input" type="email" name="email" placeholder={t("email")} required />
        <input className="input" type="password" name="password" placeholder={t("passwordMin")} required />
        <select className="input" name="role" defaultValue="UTLEIER">
          <option value="UTLEIER">{t("roleLandlordOnly")}</option>
          <option value="TJENESTE">{t("roleWorkerOnly")}</option>
          <option value="BEGGE">{t("roleBoth")}</option>
        </select>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn btn-primary w-full" type="submit">{t("register")}</button>
      </form>
      <p className="mt-3 text-sm">
        {t("alreadyAccount")} <Link href="/login" className="text-teal-700 underline">{t("login")}</Link>
      </p>
    </main>
  );
}