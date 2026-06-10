"use client";

import { useState } from "react";
import Image from "next/image";
import { PlayCircle, Search, Filter } from "lucide-react";
import { VIDEO_CATEGORIES } from "../../lib/constants";
import ScrollReveal from "../../components/ui/ScrollReveal";
import { Card, CardContent } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import CTABand from "../../components/sections/CTABand";

// In Phase 4 we will connect this to mt_videos, using dummy data for now
const DUMMY_VIDEOS = [
  {
    id: "v1",
    title: "How Homeopathy Treats Anxiety at the Root",
    thumbnail: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=800&auto=format&fit=crop",
    duration: "12:45",
    category: "Mental Health",
    youtubeId: "dummy1",
  },
  {
    id: "v2",
    title: "5 Signs Your Hormones are Imbalanced (And What to Do)",
    thumbnail: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop",
    duration: "08:20",
    category: "Hormonal Health",
    youtubeId: "dummy2",
  },
  {
    id: "v3",
    title: "Natural Remedies for Deep Sleep Without Grogginess",
    thumbnail: "https://images.unsplash.com/photo-1511295742362-92c96b1cf484?q=80&w=800&auto=format&fit=crop",
    duration: "15:10",
    category: "Sleep",
    youtubeId: "dummy3",
  },
  {
    id: "v4",
    title: "Why Your PCOD Needs Constitutional Care",
    thumbnail: "https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=800&auto=format&fit=crop",
    duration: "22:00",
    category: "Hormonal Health",
    youtubeId: "dummy4",
  },
  {
    id: "v5",
    title: "Managing Workplace Burnout Naturally",
    thumbnail: "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?q=80&w=800&auto=format&fit=crop",
    duration: "10:30",
    category: "Stress",
    youtubeId: "dummy5",
  },
  {
    id: "v6",
    title: "Dietary Changes to Support Homeopathic Treatment",
    thumbnail: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=800&auto=format&fit=crop",
    duration: "14:15",
    category: "Lifestyle",
    youtubeId: "dummy6",
  },
];

export default function VideosPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVideos = DUMMY_VIDEOS.filter((video) => {
    const matchesCategory = activeCategory === "all" || video.category.toLowerCase() === activeCategory.replace("-", " ").toLowerCase();
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex flex-col">
      <section className="bg-mt-primary-bg pt-24 pb-16">
        <div className="section-container text-center">
          <ScrollReveal direction="up">
            <h1 className="font-display text-display-lg sm:text-display-xl text-mt-text mb-6">
              Video Library
            </h1>
            <p className="mx-auto max-w-2xl text-body-lg text-mt-text-secondary">
              Educational videos, health tips, and deep dives into holistic healing.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="section-padding bg-white min-h-[50vh]">
        <div className="section-container">
          {/* Filters & Search */}
          <div className="mb-12 flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex flex-wrap items-center gap-2">
              {VIDEO_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                    activeCategory === cat.slug
                      ? "bg-mt-primary text-white"
                      : "bg-mt-bg text-mt-text-secondary hover:bg-mt-primary/10 hover:text-mt-primary"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mt-text-tertiary" />
              <Input
                type="text"
                placeholder="Search videos..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Video Grid */}
          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredVideos.map((video, index) => (
                <ScrollReveal key={video.id} direction="up" delay={0.1 * (index % 3)}>
                  <Card hover className="overflow-hidden group cursor-pointer border-0 shadow-lg bg-mt-bg">
                    <div className="relative aspect-video overflow-hidden">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
                      <PlayCircle className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/90 opacity-0 group-hover:opacity-100 transition-opacity z-20 scale-90 group-hover:scale-100 duration-300" />
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute bottom-3 right-3 z-20 rounded bg-black/80 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                        {video.duration}
                      </div>
                    </div>
                    <CardContent className="p-5">
                      <Badge variant="secondary" className="mb-3">
                        {video.category}
                      </Badge>
                      <h3 className="font-display text-lg font-bold text-mt-text line-clamp-2 group-hover:text-mt-primary transition-colors">
                        {video.title}
                      </h3>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-mt-text-secondary">
              No videos found matching your criteria.
            </div>
          )}
        </div>
      </section>

      <CTABand />
    </div>
  );
}
