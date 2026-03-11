import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SV",
  description: "SV - administrasjon av oppdrag, meldinger og varsler",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="no">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
