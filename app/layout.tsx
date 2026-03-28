import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import "./globals.css";
import { Providers } from "./providers";
import { getAppVersion } from "@/lib/app-version";
import { buildLocalBusinessStructuredData, buildOrganizationStructuredData, buildWebsiteStructuredData } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.defaultTitle,
  description: siteConfig.description,
  keywords: [
    "lokale tjenester",
    "smajobber",
    "airbnb tjenester",
    "rengjoring",
    "sma reparasjoner",
    "flyttehjelp",
    "hagearbeid",
  ],
  alternates: {
    canonical: siteConfig.url,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: siteConfig.locale,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const appVersion = getAppVersion();

  return (
    <html lang="no">
      <body>
        <JsonLd data={[buildOrganizationStructuredData(), buildLocalBusinessStructuredData(), buildWebsiteStructuredData()]} />
        <Providers appVersion={appVersion}>{children}</Providers>
      </body>
    </html>
  );
}
