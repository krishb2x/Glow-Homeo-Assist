"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { formatPrice } from "../../lib/utils";

export function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCartOpen) {
      setTimeout(() => setError(null), 300);
    }
  }, [isCartOpen]);

  const subtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const finalTotal = subtotal;

  const handleProceedToFastrrCheckout = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        amount: finalTotal,
        items: cart
      };

      const res = await fetch("/api/shipping/fastrr/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to initialize Fastrr checkout");
      if (data.mock && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.token) {
        // Ensure script is loaded
        if (!(window as any).HeadlessCheckout) {
          throw new Error("Shiprocket Checkout SDK not loaded");
        }
        
        // Launch Fastrr headless checkout
        (window as any).HeadlessCheckout.addToCart(
          new MouseEvent('click'), 
          data.token, 
          { fallbackUrl: window.location.href }
        );
      } else {
        throw new Error("Missing checkout token from Fastrr");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to launch checkout. Please try again.");
      setLoading(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">Your Cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>Your cart is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    {item.product.image_url || item.product.cover_image_path ? (
                      <img src={item.product.image_url || item.product.cover_image_path} alt={item.product.title} className="w-16 h-20 object-cover rounded-md" />
                    ) : null}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 line-clamp-2 leading-tight text-sm">{item.product.title}</h4>
                      
                      {/* Format Badge */}
                      <div className="mt-1.5 mb-1">
                        {(() => {
                          const format = item.product.metadata?.format || item.product.product_type || item.product.type;
                          let label = '📱 PDF eBook';
                          let bg = 'bg-blue-50 text-blue-900 border-blue-200';
                          
                          if (format?.toLowerCase().includes('hardcover')) { label = '📘 Hardcover'; bg = 'bg-indigo-50 text-indigo-900 border-indigo-200'; }
                          else if (format?.toLowerCase().includes('paperback') || format?.toLowerCase().includes('physical')) { label = '📚 Paperback'; bg = 'bg-amber-50 text-amber-900 border-amber-200'; }
                          else if (format?.toLowerCase().includes('epub')) { label = '📱 EPUB'; bg = 'bg-purple-50 text-purple-900 border-purple-200'; }
                          else if (format?.toLowerCase().includes('kindle')) { label = '📖 Kindle'; bg = 'bg-stone-50 text-stone-900 border-stone-200'; }
                          else if (format?.toLowerCase().includes('audio')) { label = '🎧 Audiobook'; bg = 'bg-rose-50 text-rose-900 border-rose-200'; }
                          else if (format?.toLowerCase().includes('combo') || format?.toLowerCase().includes('bundle')) { label = '📦 Combo Pack'; bg = 'bg-emerald-50 text-emerald-900 border-emerald-200'; }

                          return (
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${bg}`}>
                              {label}
                            </span>
                          );
                        })()}
                      </div>

                      <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-bold text-gray-900">{formatPrice((item.product.price || 0) * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t bg-gray-50 mt-auto">
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>

            <button onClick={handleProceedToFastrrCheckout} disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#0f4c3a] hover:bg-[#0a382a] text-white py-3.5 rounded-xl font-medium transition shadow-lg shadow-emerald-900/20 disabled:opacity-70">
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Secure Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
