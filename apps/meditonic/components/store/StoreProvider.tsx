"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { CartItem, Product } from "@/types/store";

interface StoreContextType {
  cart: CartItem[];
  addToCart: (product: Product, utmSource?: string, utmCampaign?: string) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const CART_STORAGE_KEY = "meditonic_store_cart";
const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All Books");

  // Load cart from localStorage with 7-day TTL
  useEffect(() => {
    try {
      const storedData = localStorage.getItem(CART_STORAGE_KEY);
      if (storedData) {
        const { items, timestamp } = JSON.parse(storedData);
        if (Date.now() - timestamp < CART_TTL_MS) {
          setCart(items);
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error("Failed to load cart", e);
    }
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify({ items: cart, timestamp: Date.now() })
      );
    } catch (e) {
      console.error("Failed to save cart", e);
    }
  }, [cart]);

  const addToCart = (product: Product, utmSource?: string, utmCampaign?: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1, utm_source: utmSource, utm_campaign: utmCampaign }
            : item
        );
      }
      return [...prev, { product, quantity: 1, utm_source: utmSource, utm_campaign: utmCampaign }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );
  
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount,
        isCartOpen,
        setIsCartOpen,
        searchQuery,
        setSearchQuery,
        activeFilter,
        setActiveFilter,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
