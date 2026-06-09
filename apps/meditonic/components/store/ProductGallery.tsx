"use client";

import React, { useState } from "react";
import { Play } from "lucide-react";

interface ProductGalleryProps {
  title: string;
  coverImage: string;
  galleryImages?: string[];
  isCombo: boolean;
  videoUrl?: string; // We'll use this later for the video task
}

export default function ProductGallery({
  title,
  coverImage,
  galleryImages = [],
  isCombo,
  videoUrl
}: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Compile all media into a single array
  const media = [];

  // 2. Add the main cover image
  if (coverImage) {
    media.push({ type: 'image', url: coverImage, thumbnail: coverImage });
  }

  // 3. Add gallery images
  galleryImages.forEach(img => {
    const url = img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${img}`;
    media.push({ type: 'image', url, thumbnail: url });
  });

  if (media.length === 0) {
    return (
      <div className={`relative w-full ${isCombo ? 'aspect-[4/3]' : 'aspect-[3/4]'} bg-gradient-to-br from-[#1B6B5C] to-[#0A3D33] rounded-2xl overflow-hidden shadow-sm border border-mt-border flex items-center justify-center p-8`}>
        <span className="text-white/50 font-display text-4xl text-center leading-tight drop-shadow-md">
          {title}
        </span>
      </div>
    );
  }

  const activeMedia = media[activeIndex];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Main Viewport */}
      <div className={`relative w-full ${isCombo ? 'aspect-[4/3]' : 'aspect-[3/4]'} bg-mt-primary-bg rounded-2xl overflow-hidden shadow-sm border border-mt-border group`}>
        <img
          src={activeMedia.url}
          alt={`${title} - view ${activeIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
      </div>

      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
          {media.map((item, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={`relative w-20 h-24 shrink-0 rounded-lg overflow-hidden border-2 transition-all snap-center ${
                activeIndex === idx ? "border-mt-primary shadow-md" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img
                src={item.thumbnail}
                alt={`Thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
