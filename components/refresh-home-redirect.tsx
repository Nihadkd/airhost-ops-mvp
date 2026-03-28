"use client";

import { useEffect } from "react";

function wasPageReloaded() {
  if (typeof window === "undefined" || typeof performance === "undefined") {
    return false;
  }

  const [navigationEntry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  if (navigationEntry?.type === "reload") {
    return true;
  }

  const legacyNavigation = performance.navigation;
  return legacyNavigation?.type === legacyNavigation.TYPE_RELOAD;
}

export function RefreshHomeRedirect() {
  useEffect(() => {
    if (!wasPageReloaded()) return;
    if (window.location.pathname === "/") return;

    window.location.replace("/");
  }, []);

  return null;
}
