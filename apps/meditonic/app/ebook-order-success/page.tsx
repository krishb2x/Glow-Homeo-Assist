"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";

export default function EbookSuccessPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-[80vh] items-center justify-center bg-mt-bg py-20 px-4">
      <ScrollReveal direction="up" className="w-full max-w-2xl">
        <Card className="overflow-hidden border-0 shadow-2xl">
          <div className="h-3 w-full bg-mt-secondary" />
          <CardContent className="p-8 sm:p-12 text-center">
            
            <div className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-mt-secondary/10 text-mt-secondary-dark">
              <ShieldCheck className="h-12 w-12" />
            </div>

            <h1 className="font-display text-display-md text-mt-text mb-4">
              Payment Successful!
            </h1>
            
            <p className="text-body-lg text-mt-text-secondary mb-8">
              Thank you for your purchase. Your order has been securely processed.
            </p>

            <div className="bg-mt-secondary/10 rounded-2xl p-6 mb-8 text-left border border-mt-secondary/20">
              <h3 className="font-semibold text-mt-text mb-4">Important Delivery Information</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-mt-text-secondary">
                  <Mail className="h-5 w-5 text-mt-secondary-dark shrink-0 mt-0.5" />
                  <span><strong>Manual Dispatch:</strong> To ensure you receive the correct file securely, our team will manually email the PDF to you within the next 24 hours.</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-mt-text-secondary">
                  <Download className="h-5 w-5 text-mt-secondary-dark shrink-0 mt-0.5" />
                  <span><strong>Download Format:</strong> The eBook will be sent as a secure PDF file compatible with all devices (mobile, tablet, desktop).</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link href="/ebooks">Browse More eBooks</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto group">
                <Link href="/">
                  Return Home <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

          </CardContent>
        </Card>
      </ScrollReveal>
    </div>
  );
}
