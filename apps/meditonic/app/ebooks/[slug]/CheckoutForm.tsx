"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface CheckoutFormProps {
  ebook: any;
  isPhysical: boolean;
}

export default function CheckoutForm({ ebook, isPhysical }: CheckoutFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const refCode = localStorage.getItem("mt_referral_code");
      const res = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: ebook.price,
          items: [{
            product: ebook,
            quantity: 1
          }],
          contact: {
            name,
            email,
            phone,
            ...(isPhysical && { shippingAddress }),
          },
          referralCode: refCode || undefined
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create order");
      }

      // Razorpay Checkout modal
      const options = {
        key: responseData.keyId,
        amount: Math.round(ebook.price * 100),
        currency: "INR",
        name: "MediTonic",
        description: `Purchase: ${ebook.title}`,
        order_id: responseData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mtOrderId: responseData.mtOrderId,
              }),
            });
            if (!verifyRes.ok) throw new Error("Payment verification failed");
            router.push(`/payment-success?order_id=${responseData.mtOrderId}`);
          } catch (e) {
            console.error("Verification failed:", e);
            setError("Payment verification failed. Please contact support.");
            setIsSubmitting(false);
          }
        },
        prefill: {
          name,
          email,
          contact: phone,
        },
        theme: {
          color: "#D4A574", // mt-secondary
        },
      };

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
    <form onSubmit={handlePurchase} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}
      
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-mt-text mb-1">
          Full Name
        </label>
        <Input
          id="name"
          required
          placeholder="Dr. Rajesh Kumar"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-mt-text mb-1">
          Email Address
        </label>
        <Input
          id="email"
          type="email"
          required
          placeholder="rajesh.k@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="mt-1 flex items-center text-xs text-mt-text-tertiary">
          <Mail className="mr-1 h-3 w-3" /> Digital files will be sent here
        </p>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-mt-text mb-1">
          WhatsApp Number
        </label>
        <Input
          id="phone"
          type="tel"
          required
          placeholder="+91 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="mt-1 flex items-center text-xs text-mt-text-tertiary">
          <Send className="mr-1 h-3 w-3" /> For order updates via WhatsApp
        </p>
      </div>

      {isPhysical && (
        <div>
          <label htmlFor="shipping" className="block text-sm font-medium text-mt-text mb-1">
            Complete Shipping Address
          </label>
          <textarea
            id="shipping"
            required
            placeholder="House/Flat No, Street, Landmark, City, State, Pincode"
            value={shippingAddress}
            onChange={(e) => setShippingAddress(e.target.value)}
            disabled={isSubmitting}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          <p className="mt-1 flex items-center text-xs text-mt-text-tertiary">
            Physical copies will be delivered Pan India within 5-7 days.
          </p>
        </div>
      )}
      
      <Button 
        type="submit" 
        size="lg" 
        className="w-full mt-2 bg-mt-primary hover:bg-mt-primary-dark"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Processing..." : `Pay Now`}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-xs text-mt-text-tertiary mt-4">
        <ShieldCheck className="h-4 w-4" /> Secure checkout powered by Razorpay
      </p>
    </form>
  );
}
