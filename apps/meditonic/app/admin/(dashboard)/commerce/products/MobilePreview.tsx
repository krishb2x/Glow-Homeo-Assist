"use client";

import React from "react";
import { ArrowLeft, CheckCircle2, FileText, Layers, Truck, Star, Search, Menu, ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface MobilePreviewProps {
  payload: any;
  onBack: () => void;
  onConfirm: () => void;
  isSaving: boolean;
}

export default function MobilePreview({ payload, onBack, onConfirm, isSaving }: MobilePreviewProps) {
  const metadata = payload.metadata || {};
  const isCombo = payload.product_type === 'BUNDLE' || payload.is_combo;
  const isPhysical = payload.product_type === 'PHYSICAL_BOOK' || payload.type === 'hardcopy';
  const rating = metadata.rating || 5.0;
  const author = metadata.author || "Dr. Aman Agrawal";
  const imageSrc = payload.cover_image_path || payload.image_url;

  return (
    <div className="flex flex-col items-center">
      <div className="w-full flex justify-between items-center mb-6 max-w-md">
        <button type="button" onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center font-semibold text-sm">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Edit
        </button>
        <button 
          type="button" 
          onClick={onConfirm} 
          disabled={isSaving}
          className="bg-[#1B6B5C] text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-[#155448] disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Confirm & Save Product"}
        </button>
      </div>

      <div className="w-full max-w-[375px] h-[812px] bg-white border-[8px] border-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative flex flex-col">
        {/* Fake Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
          <Menu className="w-5 h-5 text-slate-700" />
          <div className="font-display font-bold text-lg text-[#1B6B5C]">MediTonic</div>
          <div className="flex gap-3">
            <Search className="w-5 h-5 text-slate-700" />
            <ShoppingCart className="w-5 h-5 text-slate-700" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto bg-[#FDFDFD]">
          
          {/* Cover Image Simulation */}
          <div className="w-full aspect-square bg-gray-50 flex items-center justify-center relative p-6">
            {imageSrc ? (
              <img src={imageSrc.startsWith('http') ? imageSrc : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${imageSrc}`} alt="Cover" className="w-full h-full object-contain drop-shadow-xl" />
            ) : (
              <div className="text-gray-400 text-sm">No Cover Image</div>
            )}
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              {metadata.bestseller && (
                <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                  Bestseller
                </span>
              )}
              {metadata.custom_badge && (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide shadow-sm">
                  {metadata.custom_badge}
                </span>
              )}
            </div>
          </div>

          <div className="p-5 pb-32">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="bg-black/5 text-mt-text text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {isPhysical ? 'Physical Book' : 'Digital PDF'}
              </span>
              {isCombo && (
                <span className="bg-[#1B6B5C]/10 text-[#1B6B5C] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  Premium Bundle
                </span>
              )}
            </div>

            <h1 className="font-display text-2xl text-mt-text mb-3 leading-tight font-bold">
              {payload.title || "Untitled Product"}
            </h1>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex items-center gap-1">
                <div className="flex text-yellow-400">
                  <Star className="w-3.5 h-3.5 fill-current" />
                </div>
                <span className="text-xs font-medium text-mt-text-secondary">{rating.toFixed(1)}</span>
              </div>
              <div className="w-px h-3 bg-mt-border"></div>
              <div className="text-xs font-medium text-mt-text-secondary">
                By <span className="text-mt-text">{author}</span>
              </div>
            </div>

            <div className="mb-6 flex items-baseline gap-3">
              <span className="font-display text-3xl font-bold text-[#1B6B5C]">
                {formatPrice(payload.price || 0)}
              </span>
              {payload.original_price > payload.price && (
                <span className="text-base text-mt-text-tertiary line-through">
                  {formatPrice(payload.original_price)}
                </span>
              )}
            </div>

            <div className="prose prose-mt-primary text-mt-text-secondary mb-8 max-w-none">
              <div className="text-sm leading-relaxed space-y-3">
                {(payload.description || "No description provided.").split('\n').map((line: string, i: number) => (
                  <p key={i} className="m-0">{line}</p>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {metadata.pages && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-mt-border flex flex-col">
                  <FileText className="h-4 w-4 text-mt-secondary mb-1.5" />
                  <span className="text-xs font-bold text-mt-text">{metadata.pages} Pages</span>
                </div>
              )}
              {metadata.books && (
                <div className="bg-[#F8F9FA] p-3 rounded-xl border border-mt-border flex flex-col">
                  <Layers className="h-4 w-4 text-mt-secondary mb-1.5" />
                  <span className="text-xs font-bold text-mt-text">{metadata.books} Books</span>
                </div>
              )}
              <div className="bg-[#F8F9FA] p-3 rounded-xl border border-mt-border flex flex-col col-span-2">
                <Truck className="h-4 w-4 text-mt-secondary mb-1.5" />
                <span className="text-xs font-bold text-mt-text">{isPhysical ? 'Physical Copy' : 'Instant PDF'}</span>
                <span className="text-[10px] text-mt-text-secondary">{isPhysical ? 'Home Delivery' : 'Digital Download'}</span>
              </div>
            </div>

            {metadata.key_learnings && Array.isArray(metadata.key_learnings) && metadata.key_learnings.length > 0 && (
              <div className="mb-8">
                <h3 className="font-bold text-base text-mt-text mb-3">What you'll learn</h3>
                <ul className="space-y-2">
                  {metadata.key_learnings.map((learning: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-mt-primary shrink-0 mt-0.5" />
                      <span className="text-xs text-mt-text-secondary leading-relaxed">{learning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {metadata.verified_reviews && metadata.verified_reviews.length > 0 && (
               <div className="mb-8 pt-6 border-t border-gray-100">
                 <h3 className="font-bold text-base text-mt-text mb-3">Verified Reviews ({metadata.verified_reviews.length})</h3>
                 <div className="space-y-4">
                   {metadata.verified_reviews.slice(0, 2).map((rev: any, i: number) => (
                     <div key={i} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                       <div className="flex gap-1 mb-1 text-yellow-400">
                         {[...Array(rev.rating || 5)].map((_, j) => <Star key={j} className="w-3 h-3 fill-current" />)}
                       </div>
                       <p className="font-semibold text-xs text-mt-text">{rev.name}</p>
                       <p className="text-[10px] text-mt-text-secondary mt-1">{rev.comment}</p>
                     </div>
                   ))}
                 </div>
               </div>
            )}

          </div>
        </div>

        {/* Sticky Mobile Buy Action */}
        <div className="absolute bottom-0 left-0 w-full bg-white border-t border-mt-border p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] text-mt-text-secondary font-medium">Total Price</span>
              <span className="font-bold text-base text-[#1B6B5C]">{formatPrice(payload.price || 0)}</span>
            </div>
            {metadata.preview_pdf_path && (
              <a
                href={metadata.preview_pdf_path.startsWith('http') ? metadata.preview_pdf_path : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${metadata.preview_pdf_path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-mt-primary text-mt-primary text-xs font-semibold flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Sample
              </a>
            )}
          </div>
          <button className="w-full bg-mt-secondary text-white py-3 rounded-xl font-bold text-sm">
            Add to Cart
          </button>
        </div>

      </div>
    </div>
  );
}
