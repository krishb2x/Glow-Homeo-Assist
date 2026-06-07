"use client";

import { useState } from "react";
import { BRAND } from "@/lib/constants";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Moon, Sparkles } from "lucide-react";
import Script from "next/script";

const PROGRAMS = [
  {
    id: "prog_sleep_123",
    title: "Deep Sleep Wellness Program",
    icon: Moon,
    description: "A 3-month comprehensive protocol to restore your natural circadian rhythm and cure chronic insomnia.",
    price: 1999,
    benefits: [
      "Initial 45-minute deep consultation",
      "Constitutional homeopathic remedies for 3 months",
      "Bi-weekly follow-ups and tracking",
      "Sleep hygiene and lifestyle guide"
    ]
  },
  {
    id: "prog_hormone_124",
    title: "Hormonal Harmony Protocol",
    icon: Sparkles,
    description: "Specifically designed for PCOD, thyroid imbalances, and hormonal acne using gentle, root-cause remedies.",
    price: 2499,
    benefits: [
      "In-depth hormonal timeline analysis",
      "Targeted remedies shipped to your door",
      "Dietary alignment for hormonal health",
      "Direct WhatsApp access to Dr. Aman"
    ]
  }
];

export default function ProgramsPage() {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleEnroll = async (programId: string, price: number) => {
    setLoadingId(programId);
    try {
      // Create Order
      const res = await fetch("/api/program-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          name: "Guest Patient", // Normally collected via an input modal
          email: "guest@meditonic.com", 
          phone: "+910000000000",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");

      // Open Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_MEDITONIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: "INR",
        name: "MediTonic Programs",
        description: "Program Enrollment",
        order_id: data.razorpayOrderId,
        handler: function (response: any) {
          window.location.href = `/payment-success?enrollment_id=${data.enrollmentId}`;
        },
        theme: { color: "#1B6B5C" },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        alert("Payment gateway failed to load. Please check your connection.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-mt-bg">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <section className="bg-mt-primary-bg pt-16 pb-12 sm:pt-24 sm:pb-20">
        <div className="section-container text-center max-w-3xl">
          <ScrollReveal direction="up">
            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-6">
              Specialized Treatment Programs
            </h1>
            <p className="text-body-lg text-mt-text-secondary">
              Commit to your deep healing. Our structured, multi-month protocols provide 
              comprehensive care and continuous support to resolve chronic conditions from their roots.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding">
        <div className="section-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {PROGRAMS.map((program, idx) => (
              <ScrollReveal key={program.id} direction="up" delay={idx * 0.1}>
                <Card className="h-full flex flex-col p-8 border-t-4 border-t-mt-primary hover:shadow-xl transition-shadow duration-300">
                  <div className="w-12 h-12 bg-mt-secondary/20 rounded-xl flex items-center justify-center mb-6 text-mt-primary">
                    <program.icon className="w-6 h-6" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-mt-text mb-3">{program.title}</h2>
                  <p className="text-mt-text-secondary mb-6 flex-grow">{program.description}</p>
                  
                  <div className="mb-8 space-y-3">
                    {program.benefits.map((benefit, bIdx) => (
                      <div key={bIdx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-mt-secondary flex-shrink-0 mt-0.5" />
                        <span className="text-mt-text-secondary text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-mt-border mt-auto">
                    <div className="flex items-end justify-between mb-6">
                      <div>
                        <p className="text-sm text-mt-text-secondary font-medium mb-1">Total Investment</p>
                        <p className="font-display text-3xl font-bold text-mt-text">₹{program.price}</p>
                      </div>
                    </div>
                    <Button 
                      className="w-full" 
                      size="lg" 
                      disabled={loadingId === program.id}
                      onClick={() => handleEnroll(program.id, program.price)}
                    >
                      {loadingId === program.id ? "Processing..." : "Enroll Now"}
                    </Button>
                  </div>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
