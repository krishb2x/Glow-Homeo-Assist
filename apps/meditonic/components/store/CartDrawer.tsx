"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { X, ArrowRight, ShieldCheck, CheckCircle2, Loader2, Tag, Percent, Lock, MapPin } from "lucide-react";
import { formatPrice } from "../../lib/utils";
import { useReferral } from "../../lib/hooks/useReferral";
import { isReferralApplicable, findReferralOverride } from "../../lib/referrals/product-mapping";
import { formatCategoryName } from "./StorefrontClient";

export const CartDrawer = () => {
  const { cart, removeFromCart, cartTotal, isCartOpen, setIsCartOpen, clearCart } = useStore();
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "contact" | "payment" | "confirmation">("cart");
  
  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Shipping Address State
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [pincodeError, setPincodeError] = useState("");
  const [validatingPincode, setValidatingPincode] = useState(false);

  // Logistics serviceability state
  const [isServiceable, setIsServiceable] = useState(true);
  const [codAvailable, setCodAvailable] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'prepaid' | 'cod' | 'partial_cod'>('prepaid');

  const hasPhysicalItems = cart.some(item => 
    item.product.product_type === 'PHYSICAL_BOOK' || 
    item.product.product_type === 'TREATMENT_KIT'
  );

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

  // PIN Code API Auto-fill
  useEffect(() => {
    const lookupPincode = async () => {
      if (pincode.length !== 6) {
        setPincodeError("");
        setIsServiceable(true);
        setCodAvailable(false);
        setShippingCharge(0);
        setPaymentMethod('prepaid');
        return;
      }
      if (!/^\d{6}$/.test(pincode)) {
        setPincodeError("PIN code must be exactly 6 digits");
        return;
      }

      setValidatingPincode(true);
      setPincodeError("");
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await res.json();
        
        if (data && data[0] && data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            const resolvedCity = postOffices[0].District || postOffices[0].Division;
            const resolvedState = postOffices[0].State;
            setCity(resolvedCity);
            setState(resolvedState);
            setPincodeError("");

            // Dynamically check serviceability & rates
            const totalWeight = cart.reduce((acc, item) => acc + (Number((item.product as any).weight_grams || 500) * item.quantity), 0);
            const servRes = await fetch(`/api/shipping/serviceability?pincode=${pincode}&weight=${totalWeight}`);
            const servData = await servRes.json();
            
            const skipShippingCheck = cart.some(item => (item.product as any).bypass_shipping_check === true);
            
            if (servData.isServiceable || skipShippingCheck) {
              setIsServiceable(true);
              setCodAvailable(skipShippingCheck ? true : servData.codAvailable);
              setShippingCharge(servData.shippingCharge || (skipShippingCheck ? 60.00 : 0));
              setPincodeError("");
            } else {
              setIsServiceable(false);
              setCodAvailable(false);
              setShippingCharge(0);
              setPincodeError("This PIN code is not serviceable for shipping.");
            }
          } else {
            setPincodeError("Invalid PIN code. Not found.");
          }
        } else {
          setPincodeError("PIN code not found.");
        }
      } catch (err) {
        console.error("PIN code lookup failed:", err);
        setPincodeError("Failed to lookup PIN code. Please type city/state manually.");
      } finally {
        setValidatingPincode(false);
      }
    };

    lookupPincode();
  }, [pincode]);

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

  // Reset step when closed so subsequent checkouts start fresh
  useEffect(() => {
    if (!isCartOpen) {
      const timer = setTimeout(() => setCheckoutStep("cart"), 300);
      return () => clearTimeout(timer);
    }
  }, [isCartOpen]);

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
      // Find override configuration using prioritized resolution
      let override: any = findReferralOverride(discountInfo.applicableProducts, item.product.id, item.product.product_type);

      // If override explicitly disabled, skip discount for this item
      if (override && override.is_active === false) {
        return;
      }

      // If overrides exist but none match this item, then it's not eligible
      if (discountInfo.applicableProducts && discountInfo.applicableProducts.length > 0 && !override) {
        return;
      }

      // Resolve discount type and value from per-product override (single source of truth)
      let dType = override?.discount_type || "percentage";
      let dValue = override ? Number(override.discount_value ?? 10) : 10;

      if (override && override.discount_type && override.discount_value !== undefined && override.discount_value !== null) {
        dType = override.discount_type;
        dValue = Number(override.discount_value);
      }

      // Calculate discount for this item
      const itemPrice = item.product.price;
      if (dType === 'percentage') {
        discountAmount += ((itemPrice * dValue) / 100) * item.quantity;
      } else {
        discountAmount += Math.min(dValue, itemPrice) * item.quantity;
      }
    });
  }
  const finalTotal = Math.max(0, cartTotal - discountAmount + shippingCharge);
  
  const savings = Math.max(0, originalTotal - cartTotal + discountAmount);

  const partialCodDeposit = cart.reduce((acc, item) => acc + (Number((item.product as any).partial_cod_amount || 150) * item.quantity), 0);

  const handleCreateOrderAndPay = async () => {
    if (!name || !email || !phone) return alert("Please fill all contact details.");
    
    if (hasPhysicalItems) {
      if (!pincode || !street || !city || !state) {
        return alert("Please fill in all required shipping address fields.");
      }
      if (pincode.length !== 6 || pincodeError) {
        return alert("Please enter a valid 6-digit PIN code.");
      }
      if (!isServiceable) {
        return alert("We cannot ship to this PIN code. Please use a serviceable address.");
      }
    }

    setLoading(true);
    try {
      if (hasPhysicalItems && paymentMethod === 'cod') {
        // Direct COD checkout (no Razorpay popup!)
        const res = await fetch("/api/shipping/create-cod-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            amount: finalTotal,
            items: cart,
            contact: { name, email, phone },
            referralCode: discountInfo?.code,
            shippingAddress: { street, landmark, city, state, pincode }
          })
        });
        const data = await res.json();
        if (data.success) {
          clearCart();
          setCheckoutStep("confirmation");
        } else {
          alert(`COD checkout failed: ${data.error}`);
        }
        return;
      }

      // Prepaid or Partial COD checkout (needs Razorpay popup!)
      const upfrontAmount = hasPhysicalItems && paymentMethod === 'partial_cod' ? partialCodDeposit : finalTotal;
      const codAmountPending = hasPhysicalItems && paymentMethod === 'partial_cod' ? (finalTotal - partialCodDeposit) : 0;
      const partialCodDeposited = hasPhysicalItems && paymentMethod === 'partial_cod' ? partialCodDeposit : 0;

      // 1. Create order on server
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: upfrontAmount,
          items: cart,
          contact: { name, email, phone },
          referralCode: discountInfo?.code,
          shippingAddress: hasPhysicalItems ? {
            street,
            landmark,
            city,
            state,
            pincode
          } : undefined,
          paymentMethod: hasPhysicalItems ? paymentMethod : "prepaid",
          codAmountPending,
          partialCodDeposited
        })
      });
      
      const { orderId, mtOrderId, keyId } = await res.json();
      if (!orderId || !keyId) throw new Error("Failed to create order");

      // 2. Open Razorpay
      const options = {
        key: keyId,
        amount: upfrontAmount * 100,
        currency: "INR",
        name: "MediTonic",
        description: hasPhysicalItems && paymentMethod === 'partial_cod' ? "Partial COD Deposit" : "Store Purchase",
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

  const renderProgress = () => {
    const steps = [
      { id: "cart", label: "Cart" },
      { id: "contact", label: "Details" },
      { id: "payment", label: "Pay" }
    ];
    
    const currentIdx = steps.findIndex(s => s.id === checkoutStep);
    
    return (
      <div className="w-full px-1 mb-6">
        <div className="flex items-center justify-between relative">
          {/* Line Background */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
          {/* Line Active Progress */}
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-mt-primary -translate-y-1/2 z-0 transition-all duration-500" 
            style={{ width: `${currentIdx >= 0 ? (currentIdx / (steps.length - 1)) * 100 : 0}%` }}
          />
          
          {steps.map((step, idx) => {
            const isCompleted = idx < currentIdx;
            const isActive = step.id === checkoutStep;
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <div 
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted 
                      ? "bg-mt-primary text-white shadow-sm" 
                      : isActive 
                        ? "bg-mt-primary text-white ring-4 ring-mt-primary/15" 
                        : "bg-white border-2 border-slate-200 text-slate-400"
                  }`}
                >
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span 
                  className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                    isActive || isCompleted ? "text-mt-primary font-semibold" : "text-mt-text-tertiary"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      
      {/* Drawer */}
      <div 
        className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col transition-all duration-300 ease-out"
        style={{ height: drawerHeight, maxHeight: "90vh" }}
      >
        {/* Grab Handle for native bottom-sheet look on mobile */}
        <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mt-3 shrink-0 sm:hidden" />
        
        <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-mt-border">
          <h2 className="font-display text-xl font-bold text-mt-text">
            {checkoutStep === "cart" && "Your Cart"}
            {checkoutStep === "contact" && "Contact Info"}
            {checkoutStep === "payment" && "Processing..."}
            {checkoutStep === "confirmation" && "Order Complete"}
          </h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 -mr-2 text-mt-text-secondary hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col">
          {checkoutStep !== "confirmation" && renderProgress()}

          {/* --- STEP 1: CART --- */}
          {checkoutStep === "cart" && (
            <>
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-mt-text-secondary">Shipping Charge</span>
                      <span className="text-sm font-semibold">{shippingCharge > 0 ? formatPrice(shippingCharge) : "Free"}</span>
                    </div>
                    {paymentMethod === 'partial_cod' && (
                      <div className="flex items-center justify-between mb-2 text-orange-600">
                        <span className="text-sm">COD Balance Due (on delivery)</span>
                        <span className="text-sm font-semibold">{formatPrice(finalTotal - partialCodDeposit)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-2 pt-2 border-t border-slate-100">
                      <span className="text-base font-bold text-mt-text">
                        {paymentMethod === 'partial_cod' ? "Upfront Deposit Due" : "Final Total"}
                      </span>
                      <span className="text-base font-bold text-mt-text">
                        {formatPrice(paymentMethod === 'partial_cod' ? partialCodDeposit : finalTotal)}
                      </span>
                    </div>
                    {savings > 0 && (
                      <div className="flex items-center justify-between mb-4 bg-emerald-50 p-2 rounded-lg">
                        <span className="text-xs text-[#1B6B5C] font-bold">Total Savings</span>
                        <span className="text-xs text-[#1B6B5C] font-bold">{formatPrice(savings)}</span>
                      </div>
                    )}
                    <button onClick={() => setCheckoutStep("contact")} className="w-full bg-[#1B6B5C] hover:bg-mt-primary-dark text-white py-3.5 rounded-xl font-bold text-sm mb-2.5 transition-all shadow-md active:scale-[0.98]">
                      Proceed to Checkout
                    </button>
                    <button onClick={() => setIsCartOpen(false)} className="w-full text-xs font-bold text-mt-text-secondary text-center py-1.5 hover:underline transition-all">
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
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Full Name / पूरा नाम *</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Email / ईमेल पता (For PDF Delivery) *</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" placeholder="your.email@gmail.com" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Phone / फ़ोन नंबर (For Delivery / UPI) *</label>
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" placeholder="9876543210" />
                  </div>

                  {hasPhysicalItems && (
                    <div className="pt-3 border-t border-slate-100 space-y-3 animate-fade-in">
                      <p className="text-xs font-bold text-mt-primary flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>Shipping Address / डिलीवरी का पता</span>
                      </p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">PIN Code / पिन कोड *</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              maxLength={6}
                              value={pincode} 
                              onChange={e => setPincode(e.target.value.replace(/\D/g, ""))} 
                              className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" 
                              placeholder="110001" 
                            />
                            {validatingPincode && (
                              <Loader2 className="absolute right-3 top-2.5 w-4 h-4 text-mt-primary animate-spin" />
                            )}
                          </div>
                        </div>

                        <div className="flex items-end">
                          {pincode.length === 6 && !pincodeError && !validatingPincode && (
                            <span className="text-[10px] text-emerald-600 font-bold mb-2.5">✓ PIN Code Verified</span>
                          )}
                          {pincodeError && (
                            <span className="text-[10px] text-red-500 font-semibold mb-2">{pincodeError}</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Area, Colony, Street Address / पता *</label>
                        <input 
                          type="text" 
                          required
                          value={street} 
                          onChange={e => setStreet(e.target.value)} 
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" 
                          placeholder="Flat No, Building, Street, Area" 
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">Landmark / लैंडमार्क (Optional)</label>
                        <input 
                          type="text" 
                          value={landmark} 
                          onChange={e => setLandmark(e.target.value)} 
                          className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium" 
                          placeholder="e.g. Near Metro Station or Temple" 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">City / शहर *</label>
                          <input 
                            type="text" 
                            value={city} 
                            onChange={e => setCity(e.target.value)} 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium bg-slate-50" 
                            placeholder="New Delhi" 
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-mt-text-secondary uppercase tracking-wider mb-1">State / राज्य *</label>
                          <input 
                            type="text" 
                            value={state} 
                            onChange={e => setState(e.target.value)} 
                            className="w-full border border-slate-200 rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mt-primary/20 focus:border-mt-primary transition-all placeholder-slate-400 font-medium bg-slate-50" 
                            placeholder="Delhi" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {hasPhysicalItems && isServiceable && (
                    <div className="pt-3 border-t border-slate-100 space-y-2.5 animate-fade-in">
                      <p className="text-[10px] font-bold text-mt-text-secondary uppercase tracking-wider">Payment Options / भुगतान विकल्प *</p>
                      
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                          <input 
                            type="radio" 
                            name="paymentMethod" 
                            value="prepaid" 
                            checked={paymentMethod === 'prepaid'} 
                            onChange={() => setPaymentMethod('prepaid')} 
                            className="w-4 h-4 text-mt-primary border-slate-300 focus:ring-mt-primary"
                          />
                          <div className="text-xs font-semibold text-slate-800">
                            Pay Online (Full) / ऑनलाइन भुगतान
                          </div>
                        </label>

                        {codAvailable && cart.every(item => (item.product as any).cod_allowed !== false) && (
                          <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="cod" 
                              checked={paymentMethod === 'cod'} 
                              onChange={() => setPaymentMethod('cod')} 
                              className="w-4 h-4 text-mt-primary border-slate-300 focus:ring-mt-primary"
                            />
                            <div className="text-xs font-semibold text-slate-800">
                              Cash on Delivery (COD) / कैश ऑन डिलीवरी
                            </div>
                          </label>
                        )}

                        {codAvailable && cart.every(item => (item.product as any).partial_cod_allowed || (item.product as any).cod_allowed !== false) && (
                          <label className="flex items-center gap-3 p-3 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all">
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="partial_cod" 
                              checked={paymentMethod === 'partial_cod'} 
                              onChange={() => setPaymentMethod('partial_cod')} 
                              className="w-4 h-4 text-mt-primary border-slate-300 focus:ring-mt-primary"
                            />
                            <div className="text-xs font-semibold text-slate-800">
                              Partial COD / आंशिक कैश ऑन डिलीवरी
                              <p className="text-[9px] text-slate-500 font-normal mt-0.5">
                                Pay ₹{cart.reduce((acc, item) => acc + (Number((item.product as any).partial_cod_amount || 150) * item.quantity), 0)} upfront, rest on delivery.
                              </p>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-[10px] text-mt-text-secondary leading-tight">Your data is safe. We only use this for order delivery and support.</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 shrink-0 pb-safe pb-8">
                <button 
                  onClick={handleCreateOrderAndPay} 
                  disabled={loading}
                  className="w-full bg-[#1B6B5C] hover:bg-mt-primary-dark text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg active:scale-[0.98] transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>
                      <Lock className="w-4 h-4" />
                      {hasPhysicalItems && paymentMethod === 'cod' ? (
                        <span>Place COD Order • Pay ₹0 Now (₹{formatPrice(finalTotal)} on Delivery)</span>
                      ) : hasPhysicalItems && paymentMethod === 'partial_cod' ? (
                        <span>Pay Deposit • {formatPrice(partialCodDeposit)} (₹{formatPrice(finalTotal - partialCodDeposit)} on Delivery)</span>
                      ) : (
                        <span>Secure Checkout • Pay {formatPrice(finalTotal)}</span>
                      )}
                    </>
                  )}
                </button>
                <button onClick={() => setCheckoutStep("cart")} className="w-full text-xs font-bold text-mt-text-secondary text-center py-2.5 mt-1 hover:underline">
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
                {hasPhysicalItems ? (
                  "Your hard copy order is confirmed. A tracking number will be sent to your email as soon as it is dispatched."
                ) : (
                  "Your PDF link has been sent to your email. Check your inbox (and spam folder) in the next 60 seconds."
                )}
              </p>
              <button onClick={() => setIsCartOpen(false)} className="w-full bg-[#1B6B5C] text-white py-3.5 rounded-xl font-bold text-sm">
                {hasPhysicalItems ? "Back to Store" : "Continue Learning"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
