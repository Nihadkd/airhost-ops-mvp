import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getAppVersion } from "@/lib/app-version";

export const metadata: Metadata = {
  title: "ServNest",
  description: "ServNest - administrasjon av oppdrag, meldinger og varsler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const appVersion = getAppVersion();

  return (
    <html lang="no">
      <body>
        <Providers appVersion={appVersion}>{children}</Providers>
      </body>
    </html>
  );
}
