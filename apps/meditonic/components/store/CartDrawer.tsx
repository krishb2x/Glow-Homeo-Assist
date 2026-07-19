"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { X, Loader2, Tag, Lock } from "lucide-react";
import { formatPrice } from "../../lib/utils";
import { useReferral } from "../../lib/hooks/useReferral";
import { findReferralOverride } from "../../lib/referrals/product-mapping";
import { formatCategoryName } from "./StorefrontClient";
import { useRouter } from "next/navigation";

export const CartDrawer = () => {
  const { cart, removeFromCart, cartTotal, isCartOpen, setIsCartOpen } = useStore();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Viewport adjustment for mobile keyboards
  const [drawerHeight, setDrawerHeight] = useState("80vh");

  // Referral State
  const { referralCode: autoRefCode, clearReferral } = useReferral();
  const [referralInput, setReferralInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ type: string; value: number; code: string; applicableProducts?: any[] } | null>(null);
  const [validatingRef, setValidatingRef] = useState(false);
  const [refError, setRefError] = useState("");

  useEffect(() => {
    if (autoRefCode && !discountInfo) {
      setReferralInput(autoRefCode);
      validateReferralCode(autoRefCode);
    }
  }, [autoRefCode]);

  const validateReferralCode = async (code: string) => {
    if (!code) return;
    setValidatingRef(true);
    setRefError("");
    try {
      const res = await fetch(`/api/referral/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, items: cart })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountInfo({ 
          type: data.discountType, 
          value: data.discountValue, 
          code: data.code,
          applicableProducts: data.applicableProducts 
        });
      } else {
        setRefError(data.error || "Invalid code");
        setDiscountInfo(null);
      }
    } catch (err) {
      setRefError("Failed to validate code");
    } finally {
      setValidatingRef(false);
    }
  };

  const handleRemoveReferral = () => {
    setDiscountInfo(null);
    setReferralInput("");
    setRefError("");
    clearReferral();
  };

  useEffect(() => {
    if (!window.visualViewport) return;
    const updateViewport = () => {
      const vv = window.visualViewport;
      if (vv) {
        if (vv.height < window.innerHeight * 0.8) {
          setDrawerHeight(`${vv.height}px`);
        } else {
          setDrawerHeight("80vh");
        }
      }
    };
    
    window.visualViewport.addEventListener('resize', updateViewport);
    return () => window.visualViewport?.removeEventListener('resize', updateViewport);
  }, []);

  if (!isCartOpen) return null;

  const originalTotal = cart.reduce((total, item) => total + ((item.product.original_price || item.product.price) * item.quantity), 0);
  
  // Resolve coupon displays dynamically based on cart items
  const activeDiscountOverride = (() => {
    if (!discountInfo?.applicableProducts) return null;
    for (const item of cart) {
      const override = findReferralOverride(
        discountInfo.applicableProducts, 
        item.product.id, 
        item.product.product_type
      );
      if (override && override.is_active !== false) {
        return override;
      }
    }
    return discountInfo.applicableProducts[0];
  })();

  const displayType = discountInfo?.type || activeDiscountOverride?.discount_type || "percentage";
  const displayValue = (discountInfo?.value !== null && discountInfo?.value !== undefined)
    ? discountInfo.value 
    : (activeDiscountOverride?.discount_value !== null && activeDiscountOverride?.discount_value !== undefined)
      ? activeDiscountOverride.discount_value
      : 10;

  let discountAmount = 0;
  if (discountInfo) {
    cart.forEach(item => {
      let override: any = findReferralOverride(discountInfo.applicableProducts, item.product.id, item.product.product_type);

      if (override && override.is_active === false) {
        return;
      }

      if (discountInfo.applicableProducts && discountInfo.applicableProducts.length > 0 && !override) {
        return;
      }

      let dType = override?.discount_type || "percentage";
      let dValue = override ? Number(override.discount_value ?? 10) : 10;

      if (override && override.discount_type && override.discount_value !== undefined && override.discount_value !== null) {
        dType = override.discount_type;
        dValue = Number(override.discount_value);
      }

      const itemPrice = item.product.price;
      if (dType === 'percentage') {
        discountAmount += ((itemPrice * dValue) / 100) * item.quantity;
      } else {
        discountAmount += Math.min(dValue, itemPrice) * item.quantity;
      }
    });
  }
  
  const finalTotal = Math.max(0, cartTotal - discountAmount);
  const savings = Math.max(0, originalTotal - cartTotal + discountAmount);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/fastrr/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: finalTotal,
          items: cart,
          discountInfo: discountInfo ? { code: discountInfo.code } : null
        })
      });
      
      const data = await res.json();
      
      if (data.success && data.checkoutUrl) {
        // Redirect to Fastrr Headless Checkout
        window.location.href = data.checkoutUrl;
      } else {
        alert(data.error || "Failed to initialize checkout session.");
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert("Error initiating Fastrr checkout");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      
      <div 
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out"
        style={{ height: drawerHeight, maxHeight: "90vh" }}
      >
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />
        
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-mt-border">
          <h2 className="font-display text-xl font-bold text-mt-text">
            Your Cart
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 -mr-2 text-mt-text-secondary hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-mt-text-secondary py-10">
              <p>Your cart is empty.</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 text-[#1B6B5C] font-bold text-sm hover:underline">
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-3">
                {cart.map((item, idx) => (
                  <div key={`${item.product.id}-${idx}`} className="flex items-center gap-3.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                    <div className="w-10 h-14 bg-white rounded overflow-hidden shrink-0 relative shadow-sm border border-slate-100 flex items-center justify-center">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-mt-primary/10" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-mt-text truncate">{item.product.title}</h4>
                      <p className="text-[9px] text-mt-text-secondary truncate mt-0.5 capitalize">{formatCategoryName(item.product.category)}</p>
                      <button onClick={() => removeFromCart(item.product.id)} className="text-[9px] text-red-500 font-bold mt-1 uppercase tracking-wider hover:text-red-700 transition-colors">Remove</button>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-mt-text">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-mt-border pt-4">
                {discountInfo ? (
                  <div className="bg-[#1B6B5C]/5 rounded-xl p-3 flex items-center justify-between border border-[#1B6B5C]/20 border-dashed animate-fade-in">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 bg-[#1B6B5C]/10 rounded-lg text-mt-primary shrink-0">
                        <Tag className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#1B6B5C] uppercase tracking-wide">Referral Applied ✓</p>
                        <p className="text-[10px] font-semibold text-mt-text-secondary mt-0.5">
                          Code {discountInfo.code}: {displayType === 'percentage' ? `${displayValue}% off` : `₹${displayValue} off`}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={handleRemoveReferral} className="p-1.5 hover:bg-[#1B6B5C]/10 rounded-full transition-colors text-[#1B6B5C]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider">Referral Code / रेफरल कोड (Optional)</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={referralInput} 
                        onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                        className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all uppercase placeholder-slate-400 font-medium"
                        placeholder="e.g. AMAN10"
                      />
                      <button 
                        type="button"
                        onClick={() => validateReferralCode(referralInput)}
                        disabled={!referralInput || validatingRef}
                        className="bg-mt-primary text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-mt-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                      >
                        {validatingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {refError && <p className="text-[10px] text-red-500 font-semibold">{refError}</p>}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-mt-border shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-mt-text-secondary">Subtotal</span>
                  <span className="text-sm font-bold">{formatPrice(originalTotal)}</span>
                </div>
                {originalTotal > cartTotal && (
                  <div className="flex items-center justify-between mb-2 text-slate-500">
                    <span className="text-sm">Meditonic Discount</span>
                    <span className="text-sm font-semibold">-{formatPrice(originalTotal - cartTotal)}</span>
                  </div>
                )}
                {discountAmount > 0 && (
                  <div className="flex items-center justify-between mb-2 text-emerald-600">
                    <span className="text-sm font-medium">Referral Discount</span>
                    <span className="text-sm font-bold">-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                
                {/* Shipping charges are calculated dynamically inside Fastrr Checkout now */}
                <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
                  <span className="text-base font-bold text-mt-text">
                    Total
                  </span>
                  <span className="text-base font-bold text-mt-text">
                    {formatPrice(finalTotal)}
                  </span>
                </div>
                <div className="text-[10px] text-mt-text-tertiary text-right mb-4">
                  + Shipping charges (if applicable) calculated at checkout
                </div>

                {savings > 0 && (
                  <div className="flex items-center justify-between mb-4 bg-emerald-50 p-2 rounded-lg">
                    <span className="text-xs text-[#1B6B5C] font-bold">Total Savings</span>
                    <span className="text-xs text-[#1B6B5C] font-bold">{formatPrice(savings)}</span>
                  </div>
                )}
                
                <button 
                  onClick={handleCheckout} 
                  disabled={loading}
                  className="w-full bg-[#1B6B5C] hover:bg-mt-primary-dark text-white py-3.5 rounded-xl font-bold text-sm mb-2.5 transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                      <Lock className="w-4 h-4" /> Secure Checkout
                    </>
                  )}
                </button>
                <button onClick={() => setIsCartOpen(false)} className="w-full text-xs font-bold text-mt-text-secondary text-center py-1.5 hover:underline transition-all">
                  Continue Shopping
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
