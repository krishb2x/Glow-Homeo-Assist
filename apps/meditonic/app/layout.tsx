import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/constants";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name}`,
    default: `${BRAND.name} — Premium Homeopathy by ${BRAND.doctor}`,
  },
  description: BRAND.tagline,
  metadataBase: new URL(BRAND.siteUrl),
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: BRAND.siteUrl,
    siteName: BRAND.name,
    title: `${BRAND.name} — Premium Homeopathy`,
    description: BRAND.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — Premium Homeopathy`,
    description: BRAND.tagline,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#1B6B5C", // mt-primary
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`scroll-smooth ${inter.variable} ${outfit.variable}`}>
      <body className="flex min-h-screen flex-col font-sans text-mt-text antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-mt-primary focus:text-white"
        >
          Skip to main content
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
