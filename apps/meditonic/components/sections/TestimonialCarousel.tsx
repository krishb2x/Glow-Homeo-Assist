"use client";

import { useState } from "react";
import Image from "next/image";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { DUMMY_TESTIMONIALS } from "../../lib/dummy-data";
import ScrollReveal from "../../components/ui/ScrollReveal";

export default function TestimonialCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  const next = () => {
    setActiveIndex((current) => 
      current === DUMMY_TESTIMONIALS.length - 1 ? 0 : current + 1
    );
  };

  const prev = () => {
    setActiveIndex((current) => 
      current === 0 ? DUMMY_TESTIMONIALS.length - 1 : current - 1
    );
  };

  return (
    <section className="section-padding overflow-hidden bg-mt-primary text-white" id="testimonials">
      <div className="section-container relative">
        {/* Background Accents */}
        <div className="absolute -left-20 -top-20 h-[300px] w-[300px] rounded-full bg-mt-primary-light/30 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-mt-primary-dark/50 blur-3xl" />

        <ScrollReveal className="relative z-10 text-center">
          <h2 className="font-display text-heading-xl sm:text-display-lg">
            Real Patients. Real Results.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-body-lg text-mt-primary-bg opacity-90">
            Don't just take our word for it. Read how Dr. Aman has helped hundreds 
            of patients restore their mental and hormonal balance.
          </p>
        </ScrollReveal>

        <div className="relative z-10 mx-auto mt-16 max-w-4xl">
          <div className="relative rounded-3xl bg-white/10 p-8 shadow-2xl backdrop-blur-md sm:p-12">
            <Quote className="absolute left-8 top-8 h-12 w-12 text-mt-secondary/30" />
            
            <div className="relative min-h-[200px] overflow-hidden">
              {DUMMY_TESTIMONIALS.map((testimonial, index) => (
                <div
                  key={testimonial.id}
                  className={`absolute left-0 top-0 w-full transition-all duration-500 ${
                    index === activeIndex
                      ? "opacity-100 translate-x-0"
                      : index < activeIndex
                      ? "opacity-0 -translate-x-full"
                      : "opacity-0 translate-x-full"
                  }`}
                  aria-hidden={index !== activeIndex}
                >
                  <div className="flex flex-col gap-6">
                    <div className="flex gap-1 text-mt-accent-gold">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    
                    <p className="text-xl leading-relaxed text-white sm:text-2xl sm:leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                    
                    <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-6">
                      <div>
                        <div className="font-display text-lg font-bold">
                          {testimonial.name}
                        </div>
                        <div className="text-sm text-mt-primary-bg opacity-80">
                          {testimonial.condition} • {testimonial.duration}
                        </div>
                      </div>
                      <div className="hidden sm:block">
                        <span className="rounded-full bg-mt-primary-dark/50 px-3 py-1 text-xs font-semibold tracking-wider text-mt-primary-bg backdrop-blur-sm">
                          {testimonial.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="mt-8 flex items-center justify-center gap-4 sm:justify-between sm:mt-12">
              <div className="hidden sm:flex gap-2">
                {DUMMY_TESTIMONIALS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? "w-8 bg-mt-secondary" : "w-2 bg-white/30 hover:bg-white/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={prev}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-mt-primary"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={next}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-mt-primary"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
