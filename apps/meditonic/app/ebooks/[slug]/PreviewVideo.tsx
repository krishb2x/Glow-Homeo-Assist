"use client";

import React, { useState, useEffect } from "react";
import { Play } from "lucide-react";

export default function PreviewVideo({ videoUrl, title }: { videoUrl: string; title: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgSrc, setImgSrc] = useState("");

  if (!videoUrl) return null;

  // Robust YouTube extraction
  let embedUrl = videoUrl;
  let videoId = "";
  
  // Match standard watch?v=, youtu.be, and shorts/
  const ytMatch = videoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/);
  
  if (ytMatch && ytMatch[1]) {
    videoId = ytMatch[1];
    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  } else {
    // Fallback if we can't extract ID, just use the raw URL (might fail X-Frame-Options)
    embedUrl = videoUrl;
  }

  // Set the initial image source after mount to ensure hydration is complete and onError binds properly
  useEffect(() => {
    if (videoId) {
      setImgSrc(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`);
    }
  }, [videoId]);

  const handleImgError = () => {
    if (videoId) {
      setImgSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
    }
  };

  return (
    <div className="w-full mb-12">
      <h3 className="font-display text-2xl font-bold text-mt-text mb-4">Preview: {title}</h3>
      <div className="relative w-full aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 group">
        {!isPlaying && videoId ? (
          <button 
            onClick={() => setIsPlaying(true)}
            className="absolute inset-0 w-full h-full flex items-center justify-center cursor-pointer group"
          >
            {imgSrc && (
              <img 
                src={imgSrc} 
                alt={`Preview of ${title}`} 
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                onError={handleImgError}
              />
            )}
            <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300"></div>
            <div className="relative w-20 h-20 bg-mt-primary/90 rounded-full flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:bg-mt-primary transition-all duration-300">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </button>
        ) : (
          <iframe 
            src={embedUrl} 
            title="Preview Video"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}
      </div>
    </div>
  );
}
