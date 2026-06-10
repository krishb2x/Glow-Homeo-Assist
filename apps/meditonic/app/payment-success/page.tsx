"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Calendar, FileText, ArrowRight } from "lucide-react";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BRAND } from "../../lib/constants";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const consultationId = searchParams.get("consultation_id");
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    if (consultationId) {
      fetch(`/api/consultation/details?id=${consultationId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDetails(data.data);
          }
        })
        .catch(console.error);
    }
  }, [consultationId]);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center bg-mt-bg py-20 px-4">
      <ScrollReveal direction="up" className="w-full max-w-2xl">
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="h-3 w-full bg-mt-success" />
          <CardContent className="p-8 sm:p-12 text-center">
            
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-mt-success/10 text-mt-success">
              <svg className="h-12 w-12 animate-draw-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="font-display text-display-md text-mt-text mb-4">
              Booking Confirmed!
            </h1>
            
            <p className="text-body-lg text-mt-text-secondary mb-8">
              Thank you for choosing {BRAND.name}. Your payment was successful and your consultation request has been received.
            </p>

            <div className="bg-mt-primary-bg rounded-2xl p-6 mb-8 text-left border border-mt-primary/20">
              <h3 className="font-semibold text-mt-text mb-4">What happens next?</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-mt-text-secondary">
                <li>Our team will review your details.</li>
                <li>You will be contacted on your registered mobile number.</li>
                <li>Consultation timing and further instructions will be shared shortly.</li>
              </ul>
            </div>

            {details && (
              <div className="text-left mb-8 border-t border-mt-border pt-6">
                <h3 className="font-semibold text-mt-text mb-4">Booking Details</h3>
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div className="text-mt-text-secondary">Booking ID:</div>
                  <div className="font-medium text-mt-text">{details.bookingId}</div>
                  
                  <div className="text-mt-text-secondary">Patient:</div>
                  <div className="font-medium text-mt-text">{details.patientName}</div>
                  
                  <div className="text-mt-text-secondary">Mobile:</div>
                  <div className="font-medium text-mt-text">{details.phone}</div>
                  
                  <div className="text-mt-text-secondary">Consultation:</div>
                  <div className="font-medium text-mt-text capitalize">{details.type?.replace('-', ' ')}</div>
                  
                  <div className="text-mt-text-secondary">Concern:</div>
                  <div className="font-medium text-mt-text capitalize">{details.concernCategory?.replace('-', ' ')}</div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/">Return to Home</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto group">
                <Link href="/treatments">
                  Explore Treatments <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[80vh] items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
