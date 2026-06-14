"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingFormSchema, type BookingFormValues } from "../../lib/validations";
import { useReferral } from "../../lib/hooks/useReferral";
import { TREATMENT_CATEGORIES } from "../../lib/constants";
import { formatPrice } from "../../lib/utils";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { isReferralApplicable } from "../../lib/referrals/product-mapping";

interface BookingFormProps {
  initialConcern?: string;
  onSuccess?: (orderId: string) => void;
  fees?: any[];
}

export default function BookingForm({ initialConcern = "", fees = [], onSuccess }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  
  const { referralCode: autoRefCode, clearReferral } = useReferral();
  const [referralInput, setReferralInput] = useState("");
  const [discountInfo, setDiscountInfo] = useState<{ type: string; value: number; code: string } | null>(null);
  const [validatingRef, setValidatingRef] = useState(false);
  const [refError, setRefError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      type: "initial_online" as any,
      concernCategory: initialConcern,
      gender: "other",
    },
  });

  // Find the single unified consultation fee
  const feeObj = fees.find((f) => f.type === "initial_online") || fees[0];
  const basePrice = feeObj ? feeObj.price : 499; // Fallback only if no DB result
  const originalPrice = feeObj && feeObj.original_price ? feeObj.original_price : basePrice;
  const meditonicDiscount = Math.max(0, originalPrice - basePrice);
  
  let discountAmount = 0;
  if (discountInfo) {
    if (discountInfo.type === 'percentage') {
      discountAmount = (basePrice * discountInfo.value) / 100;
    } else {
      discountAmount = discountInfo.value;
    }
  }
  const finalPrice = Math.max(0, basePrice - discountAmount);

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
      const res = await fetch(`/api/referral/validate?code=${encodeURIComponent(code)}&productType=consultation`);
      const data = await res.json();
      if (res.ok && data.success) {
        let finalType = "percentage";
        let finalValue = 10;

        if (data.applicableProducts && data.applicableProducts.length > 0) {
          const override = data.applicableProducts.find(
            (p: any) => p.product_id === feeObj?.id || (isReferralApplicable(p.product_type, "consultation") && !p.product_id)
          );
          if (override && override.is_active !== false) {
            if (override.discount_type && override.discount_value !== undefined && override.discount_value !== null) {
              finalType = override.discount_type;
              finalValue = Number(override.discount_value);
            }
          }
        }

        setDiscountInfo({ type: finalType, value: finalValue, code: data.code });
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

  const handleApplyReferral = () => {
    validateReferralCode(referralInput);
  };

  const handleRemoveReferral = () => {
    setDiscountInfo(null);
    setReferralInput("");
    setRefError("");
    clearReferral();
  };

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Call our API to create a consultation request and a Razorpay Order
      const payload = { ...data, referralCode: discountInfo?.code };
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create consultation request");
      }

      // 2. Open Razorpay Checkout modal
      const options = {
        key: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID,
        amount: responseData.amount, // amount in paise
        currency: "INR",
        name: "MediTonic Premium Care",
        description: `Consultation with Dr. Aman`,
        order_id: responseData.razorpayOrderId,
        handler: function (response: any) {
          // 3. Payment was successful, Razorpay sends the webhook to backend
          // We can also redirect to the success page immediately
          if (onSuccess) {
            onSuccess(responseData.consultationId);
          } else {
            window.location.href = `/payment-success?consultation_id=${responseData.consultationId}`;
          }
        },
        prefill: {
          name: data.name,
          email: data.email || "",
          contact: data.phone,
        },
        theme: {
          color: "#1B6B5C", // mt-primary
        },
      };

      // Ensure Razorpay SDK is loaded
      if (typeof window !== "undefined" && (window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
          setError(`Payment failed: ${response.error.description}`);
          setIsSubmitting(false);
        });
        rzp.open();
      } else {
        throw new Error("Payment gateway SDK not loaded");
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="rounded-lg bg-mt-error/10 p-4 text-sm text-mt-error border border-mt-error/20">
          {error}
        </div>
      )}

      {/* 1. Personal Details */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-mt-text border-b border-mt-border pb-2">1. Personal Details / व्यक्तिगत विवरण</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-mt-text">Full Name / पूरा नाम *</label>
            <Input {...register("name")} placeholder="John Doe" />
            {errors.name && <p className="text-xs text-mt-error mt-1">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-mt-text">Phone Number / फ़ोन नंबर *</label>
            <Input {...register("phone")} placeholder="+91 98765 43210" />
            {errors.phone && <p className="text-xs text-mt-error mt-1">{errors.phone.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-semibold text-mt-text">Email Address / ईमेल पता</label>
            <Input {...register("email")} type="email" placeholder="your.email@gmail.com" />
            {errors.email && <p className="text-xs text-mt-error mt-1">{errors.email.message}</p>}
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-mt-text">Age / आयु</label>
            <Input {...register("age")} type="number" min="1" max="120" placeholder="30" />
            {errors.age && <p className="text-xs text-mt-error mt-1">{errors.age.message}</p>}
          </div>
        </div>
      </div>

      {/* 2. Consultation Details */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-mt-text border-b border-mt-border pb-2">2. Consultation Details / परामर्श विवरण</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-sm font-semibold text-mt-text">Primary Concern / मुख्य समस्या *</label>
            <select 
              {...register("concernCategory")}
              className="flex h-12 w-full rounded-lg border border-mt-border bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mt-primary shadow-input"
            >
              <option value="">Select a concern...</option>
              {TREATMENT_CATEGORIES.map(c => (
                <option key={c.slug} value={c.slug}>{c.title}</option>
              ))}
              <option value="other">Other / Not Listed</option>
            </select>
            {errors.concernCategory && <p className="text-xs text-mt-error mt-1">{errors.concernCategory.message}</p>}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-mt-text">Briefly describe your symptoms / संक्षेप में अपने लक्षणों का वर्णन करें (Optional / वैकल्पिक)</label>
          <Textarea 
            {...register("concernDescription")} 
            placeholder="How long have you had this issue? What makes it better or worse?"
            className="min-h-[100px]"
          />
        </div>
      </div>

      {/* Referral Code */}
      <div className="space-y-4">
        <h3 className="font-display text-lg font-bold text-mt-text border-b border-mt-border pb-2">3. Referral Code / रेफरल कोड (Optional)</h3>
        {discountInfo ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex justify-between items-center">
            <div>
              <p className="text-emerald-800 font-semibold flex items-center gap-2">
                <span className="text-xl">✓</span> Referral Code Applied: {discountInfo.code}
              </p>
              <p className="text-sm text-emerald-600 mt-1">Special Benefit Applied</p>
            </div>
            <Button type="button" variant="outline" onClick={handleRemoveReferral} className="text-sm border-emerald-200 text-emerald-700 hover:bg-emerald-100">Remove</Button>
          </div>
        ) : (
          <div className="flex gap-3 max-w-sm">
            <Input 
              value={referralInput} 
              onChange={(e) => setReferralInput(e.target.value)} 
              placeholder="Enter referral code" 
              className="uppercase"
            />
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleApplyReferral} 
              disabled={validatingRef || !referralInput}
            >
              {validatingRef ? "Validating..." : "Apply"}
            </Button>
          </div>
        )}
        {refError && <p className="text-sm text-mt-error">{refError}</p>}
      </div>

      {/* Summary & Submit */}
      <div className="rounded-xl bg-mt-primary-bg p-6 border border-mt-primary/20">
        <div className="flex justify-between items-center mb-3">
          <span className="text-mt-text font-medium">Consultation Fee</span>
          <span className="font-display text-lg font-bold text-mt-primary">
            {formatPrice(originalPrice)}
          </span>
        </div>
        {meditonicDiscount > 0 && (
          <div className="flex justify-between items-center mb-3 text-slate-500 font-medium">
            <span>Meditonic Discount</span>
            <span>- {formatPrice(meditonicDiscount)}</span>
          </div>
        )}
        {discountInfo && (
          <div className="flex justify-between items-center mb-3 text-emerald-600 font-medium">
            <span>Referral Discount</span>
            <span>- {formatPrice(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between items-center mb-6 pt-3 border-t border-mt-primary/10">
          <span className="text-mt-text font-bold text-lg">Total Amount</span>
          <span className="font-display text-2xl font-bold text-mt-primary">{formatPrice(finalPrice)}</span>
        </div>
        
        <Button 
          type="submit" 
          size="lg" 
          className="w-full text-sm sm:text-base h-auto py-3 sm:h-14 sm:py-0 whitespace-normal" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : `Pay ${formatPrice(finalPrice)} & Book / भुगतान करें और बुक करें`}
        </Button>
        <p className="text-center text-xs text-mt-text-secondary mt-3">
          Secure payment powered by Razorpay. Doctor Aman will contact you to schedule the exact time slot after booking.
        </p>
      </div>
    </form>
  );
}
