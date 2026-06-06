"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { bookingFormSchema, type BookingFormValues } from "@/lib/validations";
import { TREATMENT_CATEGORIES } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

interface BookingFormProps {
  initialType?: string;
  initialConcern?: string;
  onSuccess?: (orderId: string) => void;
  fees?: any[];
}

export default function BookingForm({ initialType = "initial_online", initialConcern = "", fees = [], onSuccess }: BookingFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      type: initialType as any,
      concernCategory: initialConcern,
      gender: "other",
    },
  });

  const selectedType = watch("type");
  const feeObj = fees.find((f) => f.type === selectedType);
  const price = feeObj ? feeObj.price : 499; // Fallback only if no DB result

  const onSubmit = async (data: BookingFormValues) => {
    setIsSubmitting(true);
    setError("");

    try {
      // 1. Call our API to create a consultation request and a Razorpay Order
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
            <Input {...register("email")} type="email" placeholder="john@example.com" />
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

      {/* Summary & Submit */}
      <div className="rounded-xl bg-mt-primary-bg p-6 border border-mt-primary/20">
        <div className="flex justify-between items-center mb-6">
          <span className="text-mt-text font-semibold">Consultation Fee / परामर्श शुल्क</span>
          <span className="font-display text-2xl font-bold text-mt-primary">{formatPrice(price)}</span>
        </div>
        
        <Button 
          type="submit" 
          size="lg" 
          className="w-full text-base h-14" 
          disabled={isSubmitting}
        >
          {isSubmitting ? "Processing..." : `Pay ${formatPrice(price)} & Book / भुगतान करें और बुक करें`}
        </Button>
        <p className="text-center text-xs text-mt-text-secondary mt-3">
          Secure payment powered by Razorpay. Doctor Aman will contact you to schedule the exact time slot after booking.
        </p>
      </div>
    </form>
  );
}
