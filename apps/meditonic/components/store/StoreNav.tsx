"use client";

import React from "react";
import Link from "next/link";
import { ShoppingCart, Menu } from "lucide-react";
import { useStore } from "./StoreProvider";

export default function StoreNav() {
  const { cartCount, setIsCartOpen } = useStore();

  return (
    <nav className="fixed top-0 left-0 right-0 h-[52px] bg-white border-b border-mt-border z-40 px-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-mt-primary flex items-center justify-center">
            <span className="text-white font-display font-bold">M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold leading-tight text-mt-text">MediTonic</span>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-mt-text-secondary hover:text-mt-text transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          {cartCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-mt-primary text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              {cartCount}
            </span>
          )}
        </button>
        <button className="p-2 -mr-2 text-mt-text-secondary md:hidden">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
