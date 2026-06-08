"use client";

import React, { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { UploadCloud, Loader2, X, Plus, Star, ShieldCheck } from "lucide-react";

export interface VerifiedReview {
  id: string;
  review_title: string;
  review_source: string;
  review_image: string;
  verified_badge: boolean;
  review_date: string;
}

interface Props {
  reviews: VerifiedReview[];
  onChange: (reviews: VerifiedReview[]) => void;
}

export default function VerifiedReviewsManager({ reviews, onChange }: Props) {
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  const handleAddReview = () => {
    const newReview: VerifiedReview = {
      id: Math.random().toString(36).substring(2, 9),
      review_title: "Amazing Book!",
      review_source: "WhatsApp",
      review_image: "",
      verified_badge: true,
      review_date: new Date().toISOString().split('T')[0],
    };
    onChange([...reviews, newReview]);
  };

  const handleRemoveReview = (index: number) => {
    const newReviews = [...reviews];
    newReviews.splice(index, 1);
    onChange(newReviews);
  };

  const updateReview = (index: number, field: keyof VerifiedReview, value: any) => {
    const newReviews = [...reviews];
    newReviews[index] = { ...newReviews[index], [field]: value };
    onChange(newReviews);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIdx(index);
    const supabase = getSupabaseBrowser();
    const fileExt = file.name.split('.').pop();
    const fileName = `reviews/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;

    try {
      const { error } = await supabase.storage.from('meditonic-public').upload(fileName, file);
      if (error) throw error;
      
      updateReview(index, 'review_image', `meditonic-public/${fileName}`);
    } catch (err: any) {
      console.error(err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
        <div>
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Verified Reviews
          </h3>
          <p className="text-xs text-slate-500">Upload WhatsApp/Email screenshots to build trust.</p>
        </div>
        <button
          type="button"
          onClick={handleAddReview}
          className="text-xs font-semibold flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Review
        </button>
      </div>

      <div className="space-y-6">
        {reviews.map((review, idx) => (
          <div key={review.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-4 border border-slate-100 bg-slate-50 rounded-xl relative group">
            <button
              type="button"
              onClick={() => handleRemoveReview(idx)}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm z-10"
            >
              <X className="w-3 h-3" />
            </button>

            {/* Left: Image Upload */}
            <div className="md:col-span-3">
              {review.review_image ? (
                <div className="relative aspect-[3/4] bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <img 
                    src={review.review_image.startsWith('http') ? review.review_image : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${review.review_image}`} 
                    alt="Review" 
                    className="w-full h-full object-cover"
                  />
                  <button 
                    type="button" 
                    onClick={() => updateReview(idx, 'review_image', '')}
                    className="absolute bottom-2 right-2 bg-white/90 text-red-500 text-[10px] font-bold px-2 py-1 rounded shadow-sm hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative aspect-[3/4] bg-white rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center hover:bg-slate-50 cursor-pointer transition-colors">
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {uploadingIdx === idx ? <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /> : <UploadCloud className="w-5 h-5 text-slate-400 mb-1" />}
                  <span className="text-[10px] text-slate-500 font-medium">Upload Image</span>
                </div>
              )}
            </div>

            {/* Right: Details */}
            <div className="md:col-span-9 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Review Title / Quote</label>
                  <input type="text" value={review.review_title} onChange={e => updateReview(idx, 'review_title', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="e.g. Cleared all my doubts!" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
                  <input type="text" value={review.review_source} onChange={e => updateReview(idx, 'review_source', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" placeholder="e.g. WhatsApp, Email" />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Date</label>
                  <input type="date" value={review.review_date} onChange={e => updateReview(idx, 'review_date', e.target.value)} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer mt-4">
                    <input type="checkbox" checked={review.verified_badge} onChange={e => updateReview(idx, 'verified_badge', e.target.checked)} className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500" />
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> Show Verified Badge
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}

        {reviews.length === 0 && (
          <div className="text-center py-8 text-sm text-slate-500 border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
            No reviews added yet. Click "Add Review" to start.
          </div>
        )}
      </div>
    </div>
  );
}
