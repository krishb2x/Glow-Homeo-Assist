"use client";

import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnnouncementBar } from "@/types/cms";

interface AnnouncementBarsClientProps {
  bars: AnnouncementBar[];
}

export default function AnnouncementBarsClient({ bars }: AnnouncementBarsClientProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const ROTATION_DURATION = 8000; // 8 seconds
  const PROGRESS_INTERVAL = 100; // Update progress every 100ms

  useEffect(() => {
    if (bars.length <= 1) return;

    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalCount = ROTATION_DURATION / PROGRESS_INTERVAL;
    
    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % bars.length);
          return 0;
        }
        return prev + 100 / intervalCount;
      });
    }, PROGRESS_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, bars.length]);

  if (!bars || bars.length === 0) return null;

  const currentBar = bars[currentIndex];

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProgress(0);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + bars.length) % bars.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setProgress(0);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % bars.length);
  };

  return (
    <div 
      className="relative w-full overflow-hidden select-none"
      style={{ 
        backgroundColor: currentBar.bg_color || '#1B6B5C', 
        color: currentBar.text_color || '#ffffff' 
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2.5 sm:px-6 lg:px-8">
        
        {/* Left Arrow (only show if multiple bars) */}
        {bars.length > 1 && (
          <button 
            onClick={handlePrev}
            className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
            aria-label="Previous announcement"
          >
            <ChevronLeft className="w-4 h-4 opacity-80 hover:opacity-100" />
          </button>
        )}

        {/* Announcement Text */}
        <div className="flex-1 text-center px-4 transition-all duration-300 ease-in-out">
          <div className="text-xs sm:text-sm font-medium tracking-wide leading-5 truncate">
            {currentBar.link_url ? (
              <a 
                href={currentBar.link_url} 
                className="hover:underline hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
              >
                {currentBar.text}
              </a>
            ) : (
              <span>{currentBar.text}</span>
            )}
          </div>
        </div>

        {/* Right Arrow (only show if multiple bars) */}
        {bars.length > 1 && (
          <button 
            onClick={handleNext}
            className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
            aria-label="Next announcement"
          >
            <ChevronRight className="w-4 h-4 opacity-80 hover:opacity-100" />
          </button>
        )}
      </div>

      {/* Progress Indicator */}
      {bars.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-0.5 bg-black/10">
          <div 
            className="h-full bg-white/45 transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
