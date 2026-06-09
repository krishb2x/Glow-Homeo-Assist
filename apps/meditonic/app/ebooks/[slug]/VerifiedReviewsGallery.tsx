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
    <div className="mt-12">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold text-mt-text">Verified Reviews</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reviews.map((review) => {
          const imageUrl = review.review_image?.startsWith('http') 
            ? review.review_image 
            : review.review_image 
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${review.review_image}`
              : null;

          return (
            <div key={review.id} className="bg-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.04)] border border-slate-100 p-4 flex flex-col hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex text-yellow-400">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-current" />)}
                </div>
                {review.verified_badge && (
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                )}
              </div>

              {/* Title & Source */}
              <h4 className="font-bold text-sm text-mt-text mb-2 line-clamp-3 leading-snug">"{review.review_title}"</h4>
              
              <div className="flex items-center justify-between text-xs text-mt-text-secondary mb-3 mt-auto">
                <span className="font-medium bg-slate-100 px-2 py-1 rounded">{review.review_source}</span>
                {review.review_date && <span>{new Date(review.review_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>}
              </div>

              {/* Image Preview Thumbnail */}
              {imageUrl && (
                <button 
                  onClick={() => setExpandedImage(imageUrl)}
                  className="w-full h-24 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 relative group"
                >
                  <img src={imageUrl} alt={review.review_title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                    <span className="bg-white/90 text-slate-800 text-[10px] font-bold px-2 py-1 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0">
                      View Image
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
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
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
