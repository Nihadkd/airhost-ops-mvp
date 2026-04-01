"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/lib/language-context";
import { normalizeReturnTo } from "@/lib/return-to";

function LoginFormFallback() {
  const { lang, setLang, t } = useLanguage();

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <div className="mb-3 flex justify-end">
        <select className="input max-w-24" value={lang} onChange={(event) => setLang(event.target.value as "no" | "en")}>
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
      </div>
      <h1 className="text-2xl font-bold">{t("login")}</h1>
      <p className="mt-4 text-sm text-slate-600">Laster innloggingssiden...</p>
    </main>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { lang, setLang, t } = useLanguage();
  const callbackUrl = useMemo(
    () => normalizeReturnTo(searchParams.get("callbackUrl"), "/"),
    [searchParams],
  );
  const loginRequired = searchParams.get("reason") === "login-required";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  const submit = async (formData: FormData) => {
    setError("");
    setLoading(true);

    try {
      const email = String(formData.get("email") ?? "").trim().toLowerCase();
      const password = String(formData.get("password") ?? "");

      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
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

      router.push(callbackUrl);
    } catch {
      setLoading(false);
      setError(t("loginUnknownError"));
    }
  };

  return (
    <main className="mx-auto mt-16 max-w-md panel p-6">
      <div className="mb-3 flex justify-end">
        <select className="input max-w-24" value={lang} onChange={(event) => setLang(event.target.value as "no" | "en")}>
          <option value="no">NO</option>
          <option value="en">EN</option>
        </select>
      </div>
      <h1 className="text-2xl font-bold">{t("login")}</h1>
      <p className="text-sm text-slate-600">{t("loginSubtitle")}</p>
      {loginRequired ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {t("unauthorizedError")}
        </div>
      ) : null}
      <form action={submit} className="mt-4 space-y-3">
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
        <div className="space-y-2">
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder={t("password")}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
          <button
            type="button"
            className="text-sm text-teal-700 underline"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? t("hidePassword") : t("showPassword")}
          </button>
          <div>
            <Link href="/forgot-password" className="text-sm text-teal-700 underline">
              {t("forgotPassword")}
            </Link>
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button className="btn btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "..." : t("login")}
        </button>
      </form>
      <p className="mt-3 text-sm">
        {t("noAccount")}{" "}
        <Link href="/register" className="text-teal-700 underline">
          {t("register")}
        </Link>
      </p>
      <p className="mt-2 text-xs text-slate-500">
        <Link href="/privacy" className="underline">
          Personvern
        </Link>{" "}
        |{" "}
        <Link href="/terms" className="underline">
          Vilkår
        </Link>{" "}
        |{" "}
        <Link href="/support" className="underline">
          Support
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
