import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Outfit } from "next/font/google";
import { BRAND_NAME } from "../lib/brand";
import { AppProviders } from "../components/ui/providers";

function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_PUBLIC_URL || "https://app.glowhomeo.com").trim();
  const normalized = raw.replace(/\/$/, "");
  try {
    const withProto = normalized.startsWith("http") ? normalized : `https://${normalized}`;
    return new URL(withProto).origin;
  } catch {
    return "https://app.glowhomeo.com";
  }
}

const site = siteOrigin();
const defaultDescription =
  "Structured homeopathy consultations (in-clinic or online), AI-assisted clinical notes you approve, professional prescriptions, patient follow-up app, and clinic operations in one system.";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

/** Distinct, readable display font for titles — pairs with Inter for body text */
const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit"
});

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: `${BRAND_NAME} | Full clinic operating system for homeopathy`,
    template: `%s | ${BRAND_NAME}`
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: site,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} | Full clinic operating system for homeopathy`,
    description: defaultDescription
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} | Full clinic operating system for homeopathy`,
    description:
      "Structured homeopathy consultations, prescriptions, patient follow-up, and clinic operations for homeopathy practices."
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#ffffff"
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className={`${inter.className} min-h-screen bg-white text-hs-ink antialiased`}>
        <a
          href="#main-content"
          className="fixed left-4 top-4 z-[200] -translate-y-[200%] rounded-lg bg-hs-primary px-4 py-2 text-sm font-semibold text-white shadow-lg transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-hs-primary focus:ring-offset-2"
        >
          Skip to main content
        </a>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
