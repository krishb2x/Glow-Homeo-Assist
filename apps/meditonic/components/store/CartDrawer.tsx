"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { X, ArrowRight, ShieldCheck, CheckCircle2, Loader2, Tag, Percent } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useReferral } from "@/lib/hooks/useReferral";

export const CartDrawer = () => {
  const { cart, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, clearCart } = useStore();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "contact" | "payment" | "confirmation">("cart");
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

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
        // If viewport shrinks significantly, keyboard is likely up
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

  // Reset step when closed
  useEffect(() => {
    if (!isCartOpen && checkoutStep !== "confirmation") {
      setTimeout(() => setCheckoutStep("cart"), 300);
    }
  }, [isCartOpen, checkoutStep]);

  if (!isCartOpen) return null;

  const originalTotal = cart.reduce((total, item) => total + ((item.product.original_price || item.product.price) * item.quantity), 0);
  
  let discountAmount = 0;
  if (discountInfo) {
    // Calculate eligible amount
    let eligibleTotal = 0;
    if (discountInfo.applicableProducts && discountInfo.applicableProducts.length > 0) {
      cart.forEach(item => {
        const itemType = item.product.category;
        const isEligible = discountInfo.applicableProducts!.some(
          (p: any) => p.product_type === 'all' || p.product_type === itemType || p.product_id === item.product.id
        );
        if (isEligible) {
          eligibleTotal += (item.product.original_price || item.product.price) * item.quantity;
        }
      });
    } else {
      eligibleTotal = cartTotal;
    }

    if (discountInfo.type === 'percentage') {
      discountAmount = (eligibleTotal * discountInfo.value) / 100;
    } else {
      // Fixed discount cannot exceed eligible total
      discountAmount = Math.min(discountInfo.value, eligibleTotal);
    }
  }
  const finalTotal = Math.max(0, cartTotal - discountAmount);
  
  const savings = Math.max(0, originalTotal - cartTotal + discountAmount);

  const handleCreateOrderAndPay = async () => {
    if (!name || !email || !phone) return alert("Please fill all contact details.");
    
    setLoading(true);
    try {
      // 1. Create order on server
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: finalTotal,
          items: cart,
          contact: { name, email, phone },
          referralCode: discountInfo?.code
        })
      });
      
      const { orderId, mtOrderId, keyId } = await res.json();
      if (!orderId || !keyId) throw new Error("Failed to create order");

      // 2. Open Razorpay
      const options = {
        key: keyId,
        amount: finalTotal * 100,
        currency: "INR",
        name: "MediTonic",
        description: "Store Purchase",
        order_id: orderId,
        prefill: { name, email, contact: phone },
        handler: async function (response: any) {
          // 3. Verify Payment
          setCheckoutStep("payment"); // visual indicator
          const verifyRes = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              mtOrderId
            })
          });

          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            clearCart();
            setCheckoutStep("confirmation");
          } else {
            alert("Payment verification failed.");
            setCheckoutStep("cart");
          }
        },
        theme: { color: "#1B6B5C" }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Error initiating payment");
    } finally {
      setLoading(false);
    }
  };

  const renderProgress = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      <div className={`text-[10px] font-bold uppercase tracking-wider ${checkoutStep === 'cart' ? 'text-mt-primary' : 'text-mt-text-tertiary'}`}>Cart</div>
      <ArrowRight className="w-3 h-3 text-mt-text-tertiary" />
      <div className={`text-[10px] font-bold uppercase tracking-wider ${checkoutStep === 'contact' ? 'text-mt-primary' : 'text-mt-text-tertiary'}`}>Contact</div>
      <ArrowRight className="w-3 h-3 text-mt-text-tertiary" />
      <div className={`text-[10px] font-bold uppercase tracking-wider ${checkoutStep === 'payment' || checkoutStep === 'confirmation' ? 'text-mt-primary' : 'text-mt-text-tertiary'}`}>Pay</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      
      {/* Drawer */}
      <div 
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out"
        style={{ height: drawerHeight, maxHeight: "90vh" }}
      >
        <div className="flex items-center justify-between p-5 border-b border-mt-border">
          <h2 className="font-display text-xl font-bold text-mt-text">
            {checkoutStep === "cart" && "Your Cart"}
            {checkoutStep === "contact" && "Contact Info"}
            {checkoutStep === "payment" && "Processing..."}
            {checkoutStep === "confirmation" && "Order Complete"}
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 -mr-2 text-mt-text-secondary hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
          {checkoutStep !== "confirmation" && renderProgress()}

          {/* --- STEP 1: CART --- */}
          {checkoutStep === "cart" && (
            <>
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-mt-text-secondary">
                  <p>Your cart is empty.</p>
                  <button onClick={() => setIsCartOpen(false)} className="mt-4 text-[#1B6B5C] font-bold text-sm">
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="flex-1 space-y-4">
                    {cart.map((item, idx) => (
                      <div key={`${item.product.id}-${idx}`} className="flex items-start gap-4">
                        <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden shrink-0 relative">
                           {item.product.image_url ? (
                             <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full bg-mt-primary/10" />
                           )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-mt-text truncate">{item.product.title}</h4>
                          <p className="text-[10px] text-mt-text-secondary truncate mt-0.5">{item.product.category.replace('_', ' ')}</p>
                          <button onClick={() => removeFromCart(item.product.id)} className="text-[10px] text-red-500 font-bold mt-2 uppercase tracking-wider">Remove</button>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-mt-text">{formatPrice(item.product.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-mt-border pt-4">
                    {discountInfo ? (
                      <div className="bg-[#1B6B5C]/10 rounded-lg p-3 flex items-center justify-between border border-[#1B6B5C]/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-[#1B6B5C]" />
                          <div>
                            <p className="text-xs font-bold text-[#1B6B5C] uppercase">Referral Benefit Applied ✓</p>
                            <p className="text-[10px] font-semibold text-mt-text-secondary mt-0.5">
                              Code {discountInfo.code}: {discountInfo.type === 'percentage' ? `${discountInfo.value}% off` : `₹${discountInfo.value} off`}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={handleRemoveReferral} className="p-1 hover:bg-[#1B6B5C]/20 rounded">
                          <X className="w-4 h-4 text-[#1B6B5C]" />
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
                            className="flex-1 border border-mt-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mt-primary uppercase"
                            placeholder="e.g. AMAN10"
                          />
                          <button 
                            type="button"
                            onClick={() => validateReferralCode(referralInput)}
                            disabled={!referralInput || validatingRef}
                            className="bg-mt-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-mt-primary/90 disabled:opacity-50"
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
                      <span className="text-sm font-bold">{formatPrice(cartTotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-mt-text-secondary">Discount</span>
                        <span className="text-sm font-bold text-emerald-600">-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
                      <span className="text-base font-bold text-mt-text">Final Total</span>
                      <span className="text-base font-bold text-mt-text">{formatPrice(finalTotal)}</span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between mb-4 bg-emerald-50 p-2 rounded-lg">
                        <span className="text-xs text-[#1B6B5C] font-bold">Total Savings</span>
                        <span className="text-xs text-[#1B6B5C] font-bold">{formatPrice(savings)}</span>
                      </div>
                    )}
                    <button onClick={() => setCheckoutStep("contact")} className="w-full bg-[#1B6B5C] text-white py-3.5 rounded-xl font-bold text-sm mb-3">
                      Proceed to Checkout
                    </button>
                    <button onClick={() => setIsCartOpen(false)} className="w-full text-xs font-bold text-mt-text-secondary text-center py-2">
                      Continue Shopping
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* --- STEP 2: CONTACT --- */}
          {checkoutStep === "contact" && (
            <div className="flex flex-col h-full">
              <div className="flex-1 space-y-4">
                <p className="text-xs text-mt-text-secondary mb-4">Where should we send your order? / हम आपका ऑर्डर कहाँ भेजें?</p>
                <div>
                  <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Full Name / पूरा नाम *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-mt-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mt-primary" placeholder="John Doe" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Email / ईमेल पता (For PDF Delivery) *</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-mt-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mt-primary" placeholder="john@example.com" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Phone / फ़ोन नंबर (For Delivery / UPI) *</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-mt-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-mt-primary" placeholder="9876543210" />
                </div>
                <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-[10px] text-mt-text-secondary leading-tight">Your data is safe. We only use this for order delivery and support.</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 shrink-0 pb-safe pb-8">
                <button 
                  onClick={handleCreateOrderAndPay} 
                  disabled={loading}
                  className="w-full bg-[#1B6B5C] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Pay ${formatPrice(finalTotal)}`}
                </button>
                <button onClick={() => setCheckoutStep("cart")} className="w-full text-xs font-bold text-mt-text-secondary text-center py-3 mt-1">
                  Back to Cart
                </button>
              </div>
            </div>
          )}

          {/* --- STEP 3: PAYMENT --- */}
          {checkoutStep === "payment" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Loader2 className="w-10 h-10 text-mt-primary animate-spin mb-4" />
              <h3 className="text-lg font-bold text-mt-text mb-2">Processing Payment</h3>
              <p className="text-sm text-mt-text-secondary">Please do not close this window.</p>
            </div>
          )}

          {/* --- STEP 4: CONFIRMATION --- */}
          {checkoutStep === "confirmation" && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-display text-2xl font-bold text-mt-text mb-2">Order Successful!</h3>
              <p className="text-sm text-mt-text-secondary mb-6 max-w-[250px]">
                Your PDF link has been sent to your email. Check your inbox (and spam folder) in the next 60 seconds.
              </p>
              <button onClick={() => setIsCartOpen(false)} className="w-full bg-[#1B6B5C] text-white py-3.5 rounded-xl font-bold text-sm">
                Continue Learning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
