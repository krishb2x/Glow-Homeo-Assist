import "./globals.css";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Outfit } from "next/font/google";
import { BRAND_NAME } from "../lib/brand";
import { AppProviders } from "../components/ui/providers";

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
  title: `${BRAND_NAME} | Full clinic operating system for homeopathy`,
  description:
    "OPD or consulting room and online consultation on one case file, AI-assisted notes, clinic WhatsApp, patient app reminders, and follow-up. One homeopathy practice system."
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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
