import { Suspense } from "react";
import Script from "next/script";
import BookingFormWrapper from "./BookingFormWrapper";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card } from "../../components/ui/Card";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { BRAND } from "../../lib/constants";
import { createClient } from "@supabase/supabase-js";

import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book Consultation",
  description: "Secure your consultation slot with Dr. Aman Agrawal. Expert homeopathic care for your health concerns.",
  openGraph: {
    title: "Book Consultation | MediTonic",
    description: "Secure your consultation slot with Dr. Aman Agrawal. Expert homeopathic care for your health concerns.",
    url: `${BRAND.siteUrl}/book-consultation`,
    images: [
      {
        url: `${BRAND.siteUrl}/images/dr-aman.png`,
        width: 800,
        height: 600,
        alt: "Dr. Aman Agrawal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Book Consultation | MediTonic",
    description: "Secure your consultation slot with Dr. Aman Agrawal. Expert homeopathic care for your health concerns.",
    images: [`${BRAND.siteUrl}/images/dr-aman.png`],
  },
};

export const revalidate = 60;

async function getConsultationFees() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("mt_consultation_fees")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching consultation fees:", error);
    return [];
  }

  return data;
}

export default async function BookConsultationPage() {
  const fees = await getConsultationFees();

  return (
    <div className="flex flex-col min-h-screen bg-mt-bg">
      {/* Razorpay script is required for the checkout modal */}
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <section className="bg-mt-primary-bg pt-10 pb-12 sm:pt-20 sm:pb-20">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-heading-xl sm:text-display-lg text-mt-text mb-4">
              Secure Your Appointment
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Fill out your details to book a consultation with {BRAND.doctor}.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding -mt-6 sm:-mt-16">
        <div className="section-container max-w-5xl px-4 sm:px-6">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal direction="up" delay={0.1}>
              <Card className="p-6 sm:p-8 shadow-xl border-0">
                <Suspense fallback={<div className="h-[400px] flex items-center justify-center">Loading booking form...</div>}>
                  <BookingFormWrapper fees={fees} />
                </Suspense>
              </Card>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
}
