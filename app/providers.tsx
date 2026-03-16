"use client";

import { SessionProvider } from "next-auth/react";
import { AppToaster } from "@/components/app-toaster";
import { VersionRefresh } from "@/components/version-refresh";
import { LanguageProvider } from "@/lib/language-context";

export function Providers({ children, appVersion }: { children: React.ReactNode; appVersion: string }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false} refetchInterval={0}>
      <LanguageProvider>
        <VersionRefresh initialVersion={appVersion} />
        {children}
        <AppToaster />
      </LanguageProvider>
    </SessionProvider>
  );
}
