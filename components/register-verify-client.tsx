"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/language-context";

export function RegisterVerifyClient({ token }: { token: string }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!token) {
        if (!mounted) return;
        setStatus("error");
        setError(t("invalidVerificationLink"));
        return;
      }
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!mounted) return;
      if (!res.ok) {
        setStatus("error");
        setError(t("verificationFailed"));
        return;
      }
      setStatus("success");
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [t, token]);

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <h1 className="text-2xl font-bold">{t("verifyEmailTitle")}</h1>
      {status === "loading" ? <p className="mt-3 text-sm text-slate-600">{t("loading")}</p> : null}
      {status === "success" ? <p className="mt-3 text-sm text-teal-700">{t("verifyEmailSuccess")}</p> : null}
      {status === "error" ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <p className="mt-4 text-sm">
        <Link href="/login" className="text-teal-700 underline">
          {t("backToLogin")}
        </Link>
      </p>
    </main>
  );
}
