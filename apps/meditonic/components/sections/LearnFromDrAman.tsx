import Link from "next/link";
import { BookOpen, Video, ArrowRight, PlayCircle } from "lucide-react";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Button } from "@/components/ui/Button";
import { BRAND } from "@/lib/constants";

export default function LearnFromDrAman() {
  return (
    <section className="section-padding bg-mt-secondary/5 border-t border-b border-mt-border/50 overflow-hidden relative">
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-mt-primary/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-96 h-96 bg-mt-secondary/10 rounded-full blur-3xl opacity-50" />

      <div className="section-container relative z-10">
        <ScrollReveal direction="up" className="text-center mb-16 max-w-3xl mx-auto">
          <div className="inline-flex rounded-full bg-mt-primary/10 px-3 py-1 text-sm font-semibold text-mt-primary mb-4">
            Educational Mission
          </div>
          <h2 className="font-display text-heading-lg text-mt-text sm:text-display-sm mb-6">
            Learn From <span className="text-mt-primary">Dr. Aman</span>
          </h2>
          <p className="text-body-lg text-mt-text-secondary">
            Beyond clinical consultations, Dr. Aman is dedicated to simplifying medical knowledge. 
            Empower yourself with his comprehensive eBooks, clinical guides, and free YouTube content.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          
          {/* eBooks Card */}
          <ScrollReveal direction="right" delay={0.1}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-mt-border h-full flex flex-col group relative">
              <div className="absolute top-0 right-0 bg-mt-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10">
                Premium
              </div>
              <div className="p-8 flex-1 flex flex-col items-start relative z-10">
                <div className="w-16 h-16 rounded-xl bg-mt-primary/10 flex items-center justify-center mb-6 text-mt-primary transition-transform group-hover:scale-110">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-mt-text mb-4">Books & Clinical Guides</h3>
                <p className="text-mt-text-secondary mb-8 flex-1">
                  Access a vast library of meticulously crafted eBooks and clinical guides. 
                  From diagnostic series to internal medicine, get instant PDF access or order hard copies.
                </p>
                <Button asChild className="w-full sm:w-auto" size="lg">
                  <Link href="/ebooks">
                    Explore the Store <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <div className="h-2 w-full bg-mt-primary transition-all duration-300 group-hover:h-3" />
            </div>
          </ScrollReveal>

          {/* YouTube/Videos Card */}
          <ScrollReveal direction="left" delay={0.2}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-mt-border h-full flex flex-col group relative">
               <div className="absolute top-0 right-0 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg z-10 flex items-center gap-1">
                <PlayCircle className="w-3 h-3" /> Free Content
              </div>
              <div className="p-8 flex-1 flex flex-col items-start relative z-10">
                <div className="w-16 h-16 rounded-xl bg-red-50 flex items-center justify-center mb-6 text-red-600 transition-transform group-hover:scale-110">
                  <Video className="w-8 h-8" />
                </div>
                <h3 className="font-display text-2xl font-bold text-mt-text mb-4">Educational Videos</h3>
                <p className="text-mt-text-secondary mb-8 flex-1">
                  Join a growing community of learners on YouTube. Watch in-depth explanations on 
                  medical conditions, case studies, and holistic healing approaches completely for free.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 w-full">
                  <Button asChild variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" size="lg">
                    <a href={BRAND.social.youtube_meditonic} target="_blank" rel="noopener noreferrer">
                      Watch on YouTube
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="lg">
                    <Link href="/videos">
                      Video Library <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
              <div className="h-2 w-full bg-red-600 transition-all duration-300 group-hover:h-3" />
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
