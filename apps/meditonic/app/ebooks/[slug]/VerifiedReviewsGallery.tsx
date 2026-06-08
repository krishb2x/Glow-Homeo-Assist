"use client";

import React, { useState } from "react";
import { ShieldCheck, Star, X } from "lucide-react";

interface VerifiedReview {
  id: string;
  review_title: string;
  review_source: string;
  review_image: string;
  verified_badge: boolean;
  review_date: string;
}

export default function VerifiedReviewsGallery({ reviews }: { reviews: VerifiedReview[] }) {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="mt-16 border-t border-mt-border pt-12">
      <div className="text-center mb-10">
        <h2 className="font-display text-3xl font-bold text-mt-text mb-3">Student Success Stories</h2>
        <p className="text-mt-text-secondary">See what others are saying after reading</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {reviews.map((review) => {
          const imageUrl = review.review_image.startsWith('http') 
            ? review.review_image 
            : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${review.review_image}`;

          return (
            <div key={review.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                {review.verified_badge && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                )}
              </div>

              {/* Title & Source */}
              <h4 className="font-bold text-mt-text mb-2 line-clamp-2 leading-snug">"{review.review_title}"</h4>
              
              <div className="flex items-center justify-between text-xs text-mt-text-secondary mb-4 mt-auto">
                <span className="font-medium bg-slate-100 px-2 py-1 rounded">{review.review_source}</span>
                {review.review_date && <span>{new Date(review.review_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>

              {/* Image Preview Thumbnail */}
              {review.review_image && (
                <button 
                  onClick={() => setExpandedImage(imageUrl)}
                  className="w-full aspect-video rounded-xl overflow-hidden bg-slate-50 border border-slate-100 relative group"
                >
                  <img src={imageUrl} alt={review.review_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="bg-white/90 text-slate-800 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                      View Original
                    </span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {expandedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-10 backdrop-blur-sm" onClick={() => setExpandedImage(null)}>
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            onClick={(e) => { e.stopPropagation(); setExpandedImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={expandedImage} 
            alt="Verified Review" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
