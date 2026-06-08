import React from "react";
import { StoreProvider } from "@/components/store/StoreProvider";
import StoreNav from "@/components/store/StoreNav";
import { CartDrawer } from "@/components/store/CartDrawer";
import Script from "next/script";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="flex flex-col min-h-screen">
        <StoreNav />
        <main className="flex-1">{children}</main>
        <CartDrawer />
      </div>
    </StoreProvider>
  );
}
