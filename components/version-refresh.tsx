"use client";

import { useEffect, useRef, useState } from "react";

const VERSION_CHECK_INTERVAL_MS = 10_000;
const HARD_RELOAD_DELAY_MS = 750;

async function fetchLatestVersion() {
  const response = await fetch(`/api/version?t=${Date.now()}`, {
    cache: "no-store",
    headers: { "cache-control": "no-store" },
  });

  if (!response.ok) {
    throw new Error("VERSION_CHECK_FAILED");
  }

  const data = (await response.json()) as { version?: string };
  return data.version ?? null;
}

export function VersionRefresh({ initialVersion }: { initialVersion: string }) {
  const [isReloading, setIsReloading] = useState(false);
  const currentVersionRef = useRef(initialVersion);
  const reloadingRef = useRef(false);

  useEffect(() => {
    const triggerReload = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      setIsReloading(true);

      window.setTimeout(() => {
        void (async () => {
          try {
            if ("caches" in window) {
              const cacheKeys = await window.caches.keys();
              await Promise.allSettled(cacheKeys.map((cacheKey) => window.caches.delete(cacheKey)));
            }
          } catch {
            // Ignore cache storage failures and continue with a hard reload.
          }

          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("__refresh", Date.now().toString());
          window.location.replace(nextUrl.toString());
        })();
      }, HARD_RELOAD_DELAY_MS);
    };

    const checkVersion = async () => {
      if (document.visibilityState !== "visible" || reloadingRef.current) return;

      try {
        const latestVersion = await fetchLatestVersion();
        if (latestVersion && latestVersion !== currentVersionRef.current) {
          triggerReload();
        }
      } catch {
        // Ignore transient network failures.
      }
    };

    const interval = window.setInterval(() => {
      void checkVersion();
    }, VERSION_CHECK_INTERVAL_MS);

    const onFocus = () => {
      void checkVersion();
    };

    const onPageShow = () => {
      void checkVersion();
    };

    void checkVersion();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  if (!isReloading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 px-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-slate-900/95 p-6 text-center shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-300">ServNest</p>
        <h2 className="mt-3 text-2xl font-black text-white">Ny versjon tilgjengelig</h2>
        <p className="mt-3 text-sm text-slate-200">
          Siden oppdateres automatisk for å hente siste endringer.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-500 px-4 py-2 text-sm font-bold text-slate-950"
          onClick={() => window.location.reload()}
        >
          Oppdater nå
        </button>
      </div>
    </div>
  );
}
