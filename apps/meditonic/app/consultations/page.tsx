import Link from "next/link";
import { ArrowRight, Video, MapPin, CalendarClock, ShieldCheck, PhoneCall } from "lucide-react";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { BRAND } from "../../lib/constants";
import { formatPrice } from "../../lib/utils";
import CTABand from "../../components/sections/CTABand";
import { createClient } from "@supabase/supabase-js";

// Revalidate every minute so pricing updates are almost real-time
export const revalidate = 60;

// Temporary server fetch since we don't have a dedicated API client in this component
async function getConsultationFees() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from("mt_consultation_fees")
    .select("*")
    .eq("clinic_id", BRAND.clinicId)
    .eq("is_active", true)
    .order("price", { ascending: true });

  if (error) {
    console.error("Error fetching consultation fees:", error);
    return [];
  }

  return data;
}

export default async function ConsultationsPage() {
  const fees = await getConsultationFees();

  const getFee = (type: string) => fees.find((f: any) => f.type === type);
  
  // Use 'initial_online' as the unified single fee representation
  const onlineFee = getFee('initial_online');

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              Book a Consultation
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Take the first step towards natural healing. Book a consultation 
              with Dr. Aman to discuss your health concerns.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Consultation Types */}
      <section className="section-padding bg-white">
        <div className="section-container">
          <div className="max-w-2xl mx-auto">
            
            {/* Main Consultation */}
            {onlineFee && (
            <ScrollReveal direction="up" delay={0.1}>
              <Card hover className="h-full border-mt-primary/20 shadow-lg relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 bg-mt-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  POPULAR
                </div>
                <CardHeader className="pb-4">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-mt-primary/10 text-mt-primary">
                    <Video className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-2xl">Consultation</CardTitle>
                  <CardDescription className="text-base mt-2">
                    {onlineFee.description || "Comprehensive consultation with Dr. Aman. Discuss your health concerns in detail."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="mb-6 flex items-end gap-2">
                    <span className="font-display text-3xl font-bold text-mt-text">
                      {formatPrice(onlineFee.price)}
                    </span>
                    {onlineFee.original_price && onlineFee.original_price > onlineFee.price && (
                      <span className="text-lg text-mt-text-tertiary line-through pb-1">
                        {formatPrice(onlineFee.original_price)}
                      </span>
                    )}
                    <span className="text-sm text-mt-text-secondary pb-1">/ session</span>
                  </div>
                  
                  <ul className="mb-8 space-y-3 text-sm text-mt-text-secondary flex-1">
                    <li className="flex items-start gap-3">
                      <CalendarClock className="h-5 w-5 text-mt-primary shrink-0" />
                      <span>45-60 minute deep case analysis</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <ShieldCheck className="h-5 w-5 text-mt-primary shrink-0" />
                      <span>Secure, private video link provided</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <ArrowRight className="h-5 w-5 text-mt-primary shrink-0" />
                      <span>Digital prescription & care plan</span>
                    </li>
                  </ul>
                  
                  <Button asChild size="lg" className="w-full">
                    <Link href="/book-consultation">Book Session</Link>
                  </Button>
                </CardContent>
              </Card>
            </ScrollReveal>
            )}

          </div>
        </div>
      </section>

      {/* What to expect */}
      <section className="section-padding bg-mt-bg border-t border-mt-border">
        <div className="section-container max-w-4xl">
          <ScrollReveal direction="up" className="text-center mb-16">
            <h2 className="font-display text-heading-xl text-mt-text">
              What to Expect
            </h2>
            <p className="mt-4 text-mt-text-secondary">
              The homeopathic process is different from conventional medicine. Here is how your journey works.
            </p>
          </ScrollReveal>

          <div className="space-y-12">
            {[
              {
                step: "01",
                title: "Deep Case Taking",
                desc: "Your first session will be detailed (45-60 mins). We don't just ask about your main complaint; we explore your medical history, sleep patterns, emotional state, stress triggers, and lifestyle to understand your unique constitution."
              },
              {
                step: "02",
                title: "Remedy Selection",
                desc: "Based on the comprehensive analysis, Dr. Aman will select a single constitutional remedy that matches your symptom picture to stimulate your body's self-healing."
              },
              {
                step: "03",
                title: "Care Plan & Dispatch",
                desc: "You will receive a digital prescription. If you opted for physical medicines, they will be dispatched to your address (or provided in-clinic)."
              },
              {
                step: "04",
                title: "Follow-up & Tracking",
                desc: "Healing chronic conditions takes time. Follow-up sessions are usually scheduled every 2-4 weeks to monitor your progress and adjust the potency if needed."
              }
            ].map((item, i) => (
              <ScrollReveal key={item.step} direction="up" delay={0.1 * i} className="flex gap-6 md:gap-8">
                <div className="flex-shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-mt-primary text-white font-display text-2xl font-bold shadow-lg">
                    {item.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-mt-text mb-2">{item.title}</h3>
                  <p className="text-mt-text-secondary leading-relaxed">{item.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <CTABand />
    </div>
  );
}
