"use client";

import React, { useState, useEffect } from "react";
import { useStore } from "./StoreProvider";
import { X, Loader2, Tag, Lock, CheckCircle2, MapPin, ShieldCheck, CreditCard } from "lucide-react";
import { formatPrice } from "../../lib/utils";
import { useReferral } from "./ReferralProvider";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    Razorpay: any;
  }
}

type CheckoutStep = "cart" | "contact" | "payment";

export default function CartDrawer() {
  const { cart, isCartOpen, setIsCartOpen, clearCart } = useStore();
  const { referralCode, discountInfo, applyReferral, removeReferral, isApplying } = useReferral();
  const router = useRouter();

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
  });

  // Shipping State
  const [shippingCost, setShippingCost] = useState(0);
  const [isServiceable, setIsServiceable] = useState(true);
  const [codAvailable, setCodAvailable] = useState(true);
  const [checkingPincode, setCheckingPincode] = useState(false);
  
  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<"prepaid" | "cod">("prepaid");

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Reset step when closed
  useEffect(() => {
    if (!isCartOpen) {
      setTimeout(() => {
        setCheckoutStep("cart");
        setError(null);
      }, 300);
    }
  }, [isCartOpen]);

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalWeight = cart.reduce((acc, item) => acc + ((item.product.metadata?.weight_grams as number) || 500) * item.quantity, 0);
  const hasPhysical = cart.some(item => item.product.product_type === 'PHYSICAL_BOOK' || item.product.product_type === 'TREATMENT_KIT' || item.product.product_type === 'BUNDLE');
  
  const discountAmount = discountInfo ? (subtotal * discountInfo.discount_percentage) / 100 : 0;
  const finalTotal = subtotal - discountAmount + (hasPhysical ? shippingCost : 0);

  // Handle Pincode Check
  useEffect(() => {
    if (formData.pincode.length === 6 && hasPhysical) {
      const checkServiceability = async () => {
        setCheckingPincode(true);
        setError(null);
        try {
          const res = await fetch(`/api/shipping/serviceability?pincode=${formData.pincode}&weight=${totalWeight}&cod=true`);
          const data = await res.json();
          
          if (!res.ok || !data.isServiceable) {
            setIsServiceable(false);
            setError(data.error || "Delivery not available for this PIN code.");
          } else {
            setIsServiceable(true);
            setCodAvailable(data.codAvailable);
            setShippingCost(data.shippingCharge || 0);
            if (!data.codAvailable && paymentMethod === "cod") {
              setPaymentMethod("prepaid");
            }
          }
        } catch (err) {
          console.error(err);
          setError("Failed to check delivery availability.");
        } finally {
          setCheckingPincode(false);
        }
      };
      
      const timeoutId = setTimeout(checkServiceability, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setIsServiceable(true);
      setShippingCost(0);
    }
  }, [formData.pincode, totalWeight, hasPhysical, paymentMethod]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProceedToContact = () => {
    setCheckoutStep("contact");
  };

  const handleProceedToPayment = () => {
    if (!formData.name || !formData.email || !formData.phone || (hasPhysical && (!formData.street || !formData.city || !formData.state || formData.pincode.length !== 6))) {
      setError("Please fill all required fields correctly.");
      return;
    }
    if (hasPhysical && !isServiceable) {
      setError("Cannot proceed. Delivery is unavailable for your PIN code.");
      return;
    }
    setError(null);
    setCheckoutStep("payment");
  };

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        amount: finalTotal,
        items: cart,
        contact: formData,
        shippingAddress: hasPhysical ? {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode
        } : null,
        referralCode: referralCode,
        paymentMethod: paymentMethod,
        codAmountPending: paymentMethod === "cod" ? finalTotal : 0
      };

      if (paymentMethod === "prepaid") {
        // Razorpay Flow
        const res = await fetch("/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to initialize payment");

        const options = {
          key: data.keyId,
          amount: data.amount,
          currency: "INR",
          name: "MediTonic",
          description: "Store Purchase",
          order_id: data.orderId,
          handler: async function (response: any) {
            setLoading(true);
            try {
              const verifyRes = await fetch("/api/razorpay/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  mtOrderId: data.mtOrderId
                })
              });
              
              if (verifyRes.ok) {
                clearCart();
                setIsCartOpen(false);
                router.push(`/payment-success?order_id=${data.mtOrderId}`);
              } else {
                throw new Error("Payment verification failed");
              }
            } catch (err) {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          },
          prefill: {
            name: formData.name,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: "#0f4c3a"
          }
        };
        
        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function(response: any) {
          setError(response.error.description);
          setLoading(false);
        });
        rzp.open();
        
      } else {
        // COD Flow
        const res = await fetch("/api/shipping/create-cod-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error || "Failed to place COD order");
        
        clearCart();
        setIsCartOpen(false);
        router.push(`/payment-success?order_id=${data.mtOrderId}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {checkoutStep === "cart" ? "Your Cart" : checkoutStep === "contact" ? "Delivery Details" : "Secure Checkout"}
          </h2>
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
            <>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              )}

              {/* CART STEP */}
              {checkoutStep === "cart" && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div key={item.product.id} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                        {item.product.cover_image && (
                          <img src={item.product.cover_image} alt={item.product.title} className="w-16 h-20 object-cover rounded-md" />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 line-clamp-2 leading-tight text-sm">{item.product.title}</h4>
                          <p className="text-xs text-gray-500 mt-1">Qty: {item.quantity}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Referral Section */}
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2 block">Referral Code (Optional)</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. SAVE10"
                        value={referralCode}
                        onChange={(e) => applyReferral(e.target.value.toUpperCase())}
                        className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                      />
                      {discountInfo && (
                        <button onClick={removeReferral} className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg">
                          Remove
                        </button>
                      )}
                    </div>
                    {discountInfo && (
                      <p className="text-emerald-600 text-xs font-medium mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Code applied: {discountInfo.discount_percentage}% off
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* CONTACT STEP */}
              {checkoutStep === "contact" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <Tag className="w-4 h-4 text-emerald-600" /> Contact Info
                    </h3>
                    <input type="text" name="name" placeholder="Full Name" value={formData.name} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                    <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                    <input type="tel" name="phone" placeholder="Phone Number (10 digits)" value={formData.phone} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                  </div>

                  {hasPhysical && (
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" /> Shipping Address
                      </h3>
                      <input type="text" name="street" placeholder="House/Flat No, Street, Village" value={formData.street} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="text" name="city" placeholder="City/District" value={formData.city} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                        <input type="text" name="state" placeholder="State" value={formData.state} onChange={handleInputChange} className="w-full border p-3 rounded-lg text-sm" required />
                      </div>
                      <input type="text" name="pincode" placeholder="6-digit PIN Code" value={formData.pincode} onChange={handleInputChange} maxLength={6} className="w-full border p-3 rounded-lg text-sm" required />
                      
                      {checkingPincode && <p className="text-xs text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Checking delivery...</p>}
                      {formData.pincode.length === 6 && !checkingPincode && isServiceable && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Delivery available to this PIN Code</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* PAYMENT STEP */}
              {checkoutStep === "payment" && (
                <div className="space-y-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Payment Method</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-emerald-50 transition border-emerald-200 bg-white">
                        <input type="radio" name="payment" checked={paymentMethod === "prepaid"} onChange={() => setPaymentMethod("prepaid")} className="text-emerald-600 focus:ring-emerald-500" />
                        <div className="flex-1">
                          <p className="font-medium text-sm text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-emerald-600"/> Pay Online (UPI/Cards)</p>
                          <p className="text-xs text-emerald-600 mt-0.5">Recommended - Fast & Secure</p>
                        </div>
                      </label>

                      {hasPhysical && (
                        <label className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition ${!codAvailable ? "opacity-50 cursor-not-allowed bg-gray-50" : "hover:bg-gray-50 bg-white"}`}>
                          <input type="radio" name="payment" disabled={!codAvailable} checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="text-emerald-600 focus:ring-emerald-500" />
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-900">Cash on Delivery</p>
                            {!codAvailable && <p className="text-xs text-red-500 mt-0.5">Not available for this PIN code</p>}
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Payments are 100% secure. We use Razorpay's bank-grade encryption to protect your financial details.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer (Totals & Actions) */}
        {cart.length > 0 && (
          <div className="p-4 border-t bg-gray-50 mt-auto">
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discountAmount)}</span>
                </div>
              )}
              {hasPhysical && checkoutStep !== "cart" && (
                <div className="flex justify-between text-gray-600">
                  <span>Shipping</span>
                  <span>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-200">
                <span>Total</span>
                <span>{formatPrice(finalTotal)}</span>
              </div>
            </div>

            {checkoutStep === "cart" && (
              <button onClick={handleProceedToContact} className="w-full bg-[#0f4c3a] hover:bg-[#0a382a] text-white py-3.5 rounded-xl font-medium transition shadow-lg shadow-emerald-900/20">
                Proceed to Checkout
              </button>
            )}

            {checkoutStep === "contact" && (
              <div className="flex gap-2">
                <button onClick={() => setCheckoutStep("cart")} className="px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition">
                  Back
                </button>
                <button onClick={handleProceedToPayment} className="flex-1 bg-[#0f4c3a] hover:bg-[#0a382a] text-white py-3.5 rounded-xl font-medium transition shadow-lg shadow-emerald-900/20">
                  Continue to Payment
                </button>
              </div>
            )}

            {checkoutStep === "payment" && (
              <div className="flex gap-2">
                <button onClick={() => setCheckoutStep("contact")} disabled={loading} className="px-4 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-100 transition disabled:opacity-50">
                  Back
                </button>
                <button onClick={handlePlaceOrder} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-[#0f4c3a] hover:bg-[#0a382a] text-white py-3.5 rounded-xl font-medium transition shadow-lg shadow-emerald-900/20 disabled:opacity-70">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {paymentMethod === "prepaid" ? `Pay ${formatPrice(finalTotal)}` : "Place Order (COD)"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
