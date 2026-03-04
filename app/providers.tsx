"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/lib/language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchWhenOffline={false} refetchInterval={0}>
      <LanguageProvider>
        {children}
        <Toaster position="top-right" />
      </LanguageProvider>
    </SessionProvider>
  );
}
