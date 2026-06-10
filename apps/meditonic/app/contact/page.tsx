"use client";

import { useState } from "react";
import { Mail, MapPin, Phone, MessageCircle, Send } from "lucide-react";
import { BRAND } from "../../lib/constants";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call for now (Phase 3 will add actual API)
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-mt-primary pt-24 pb-32 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-mt-bg to-transparent" />
        <div className="section-container relative z-10 text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl mb-6">
              Get in Touch
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-primary-bg opacity-90">
              Have questions about homeopathic treatment? We're here to help you on your healing journey.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding -mt-20 relative z-20">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Contact Info Cards */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <ScrollReveal direction="up" delay={0.1}>
                <Card className="border-0 shadow-lg bg-white overflow-hidden">
                  <div className="h-2 w-full bg-mt-primary" />
                  <CardContent className="p-8">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mt-primary/10 text-mt-primary">
                      <Phone className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-mt-text mb-2">Call Us</h3>
                    <p className="text-mt-text-secondary mb-4">
                      Available Mon-Sat, 10:00 AM to 7:00 PM
                    </p>
                    <a href={`tel:${BRAND.phone.replace(/\D/g, "")}`} className="text-lg font-semibold text-mt-primary hover:underline">
                      {BRAND.phone}
                    </a>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.2}>
                <Card className="border-0 shadow-lg bg-white overflow-hidden">
                  <div className="h-2 w-full bg-[#25D366]" />
                  <CardContent className="p-8">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
                      <MessageCircle className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-mt-text mb-2">WhatsApp</h3>
                    <p className="text-mt-text-secondary mb-4">
                      For quick queries and appointment booking
                    </p>
                    <a href={`https://wa.me/${BRAND.whatsapp.replace(/\D/g, "")}?text=Hello%20Dr.%20Aman,%20I%20would%20like%20to%20know%20more%20about%20your%20treatments.`} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold text-[#25D366] hover:underline">
                      Chat with us
                    </a>
                  </CardContent>
                </Card>
              </ScrollReveal>

              <ScrollReveal direction="up" delay={0.3}>
                <Card className="border-0 shadow-lg bg-white overflow-hidden">
                  <div className="h-2 w-full bg-mt-secondary" />
                  <CardContent className="p-8">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-mt-secondary/10 text-mt-secondary-dark">
                      <MapPin className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-xl font-bold text-mt-text mb-2">Visit Clinic</h3>
                    <p className="text-mt-text-secondary mb-4">
                      {BRAND.address}
                    </p>
                    <a href="#" className="text-sm font-semibold text-mt-secondary-dark hover:underline flex items-center gap-1">
                      Get Directions <ArrowRight className="h-4 w-4" />
                    </a>
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-7">
              <ScrollReveal direction="left" delay={0.4} className="h-full">
                <Card className="h-full border-0 shadow-xl bg-white p-2">
                  <CardContent className="p-8 sm:p-10">
                    <div className="mb-8">
                      <h2 className="font-display text-3xl font-bold text-mt-text mb-2">Send a Message</h2>
                      <p className="text-mt-text-secondary">
                        Fill out the form below and our team will get back to you within 24 hours.
                      </p>
                    </div>

                    {isSuccess ? (
                      <div className="rounded-2xl bg-mt-success/10 p-8 text-center animate-fade-in border border-mt-success/20">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mt-success text-white">
                          <svg className="h-8 w-8 animate-draw-check" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="font-display text-xl font-bold text-mt-text mb-2">Message Sent!</h3>
                        <p className="text-mt-text-secondary mb-6">
                          Thank you for reaching out. We will contact you shortly.
                        </p>
                        <Button variant="outline" onClick={() => setIsSuccess(false)}>
                          Send Another Message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-semibold text-mt-text">Full Name *</label>
                            <Input id="name" required placeholder="John Doe" />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="phone" className="text-sm font-semibold text-mt-text">Phone Number *</label>
                            <Input id="phone" type="tel" required placeholder="+91 98765 43210" />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-semibold text-mt-text">Email Address</label>
                          <Input id="email" type="email" placeholder="john@example.com" />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="subject" className="text-sm font-semibold text-mt-text">Subject</label>
                          <Input id="subject" placeholder="How can we help you?" />
                        </div>
                        
                        <div className="space-y-2">
                          <label htmlFor="message" className="text-sm font-semibold text-mt-text">Message *</label>
                          <Textarea id="message" required placeholder="Please describe your concern..." className="min-h-[150px]" />
                        </div>
                        
                        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                          {isSubmitting ? "Sending..." : (
                            <>
                              Send Message
                              <Send className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* Map Embed Placeholder */}
      <section className="h-[400px] w-full bg-gray-200 relative">
        <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-mt-text-secondary">
          <MapPin className="h-12 w-12 text-mt-text-tertiary" />
          <p className="font-medium">Google Maps embed will be placed here</p>
        </div>
      </section>
    </div>
  );
}

// Temporary ArrowRight until lucide-react is fixed if needed
function ArrowRight(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
