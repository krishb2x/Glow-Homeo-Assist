"use client";

import { useState } from "react";
import { Star, Filter, HeartHandshake } from "lucide-react";
import { DUMMY_TESTIMONIALS } from "@/lib/dummy-data";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import CTABand from "@/components/sections/CTABand";

export default function SuccessStoriesPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", ...Array.from(new Set(DUMMY_TESTIMONIALS.map(t => t.category)))];

  const filteredStories = activeCategory === "All" 
    ? DUMMY_TESTIMONIALS 
    : DUMMY_TESTIMONIALS.filter(t => t.category === activeCategory);

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              Patient Success Stories
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Real experiences from patients who chose natural healing over 
              temporary symptom suppression.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-white min-h-[50vh]">
        <div className="section-container">
          {/* Filters */}
          <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-2 mr-4 text-mt-text-secondary font-medium">
              <Filter className="h-4 w-4" /> Filter by:
            </div>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                  activeCategory === cat
                    ? "bg-mt-secondary text-white shadow-md"
                    : "bg-mt-bg text-mt-text-secondary hover:bg-mt-secondary/10 hover:text-mt-secondary-dark"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredStories.map((story, index) => (
              <ScrollReveal key={story.id} direction="up" delay={0.1 * (index % 3)}>
                <Card className="h-full flex flex-col bg-mt-bg border-0 shadow-md">
                  <CardContent className="p-8 flex-1 flex flex-col">
                    <div className="flex gap-1 text-mt-accent-gold mb-6">
                      {[...Array(story.rating)].map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-current" />
                      ))}
                    </div>
                    
                    <blockquote className="flex-1 text-lg text-mt-text-secondary mb-8 italic relative">
                      <span className="absolute -left-2 -top-2 text-4xl text-mt-secondary/20 leading-none">"</span>
                      {story.quote}
                    </blockquote>
                    
                    <div className="flex items-center gap-4 border-t border-mt-border pt-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mt-primary/10 text-mt-primary font-display font-bold text-lg">
                        {story.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-mt-text">{story.name}</div>
                        <div className="text-sm text-mt-text-secondary">{story.condition}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Share Story CTA */}
      <section className="py-20 bg-mt-secondary/10 border-t border-mt-secondary/20">
        <div className="section-container text-center max-w-2xl mx-auto">
          <HeartHandshake className="h-16 w-16 text-mt-secondary mx-auto mb-6 opacity-80" />
          <h2 className="font-display text-3xl font-bold text-mt-text mb-4">Are you an existing patient?</h2>
          <p className="text-mt-text-secondary mb-8 text-lg">
            Your story could give hope to someone currently struggling with the same condition.
            We would love to hear about your healing journey.
          </p>
          <Button variant="secondary" size="lg">
            Share Your Story
          </Button>
        </div>
      </section>

      <CTABand />
    </div>
  );
}
