"use client";

import React, { useState } from "react";
import { Product } from "../../types/store";
import { useStore } from "./StoreProvider";
import { Crown, Star, Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice, getImageUrl } from "../../lib/utils";

// Normal Individual Product Card
export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const imageSrc = getImageUrl(product.cover_image_path || product.image_url);
  const getFormatBadge = () => {
    const format = product.metadata?.format || product.product_type || product.type || "";
    const formatStr = format.toLowerCase();
    
    if (formatStr.includes('combo') || formatStr.includes('bundle')) {
      return { label: '📦 COMBO PACK', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    }
    if (formatStr.includes('hardcover') || formatStr.includes('paperback') || formatStr.includes('physical') || formatStr.includes('hardcopy')) {
      return { label: '📘 PHYSICAL BOOK', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
    }
    
    // Default/Digital
    return { label: '📱 EBOOK (PDF)', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
  };

  const badge = getFormatBadge();
  const rating = product.metadata?.rating || 5.0;
  
  // Decide route based on if it's physical (paperback/hardcover/combo) vs digital
  const isPhysicalRoute = badge.label.includes('PHYSICAL') || badge.label.includes('COMBO') || badge.label.includes('Hardcover') || badge.label.includes('Paperback');
  const detailUrl = isPhysicalRoute ? `/store/${product.slug}` : `/ebooks/${product.slug}`;

  return (
    <Link 
      href={detailUrl} 
      className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center p-3">
        {imageSrc ? (
          <div className="relative w-full h-full">
            <Image 
              src={imageSrc} 
              alt={product.title} 
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain group-hover:scale-105 transition-transform duration-500 bg-slate-50"
              priority={product.metadata?.bestseller ? true : false}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-700 to-teal-900 flex items-center justify-center p-4 rounded-xl">
            <span className="text-white/80 font-display text-base font-bold text-center leading-tight drop-shadow-md">
              {product.title}
            </span>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-20">
          {product.metadata?.bestseller && (
            <span className="bg-yellow-400 text-yellow-950 text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 w-max border border-yellow-300">
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Bestseller
            </span>
          )}
          <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider shadow-sm w-max border ${badge.bg}`}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-1 bg-white">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-1.5">
          <div className="flex items-center text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            ))}
          </div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-semibold">{rating.toFixed(1)}</span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-display text-sm sm:text-base font-bold text-slate-800 leading-snug mb-1 group-hover:text-emerald-600 transition-colors line-clamp-2">
          {product.title}
        </h3>
        {product.metadata?.subtitle && (
          <p className="text-xs text-slate-500 line-clamp-1 mb-3">
            {product.metadata.subtitle}
          </p>
        )}

        {/* Pricing & Actions */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-50">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-extrabold text-emerald-600 leading-none">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-[10px] sm:text-xs text-slate-400 line-through mt-1">{formatPrice(product.original_price)}</span>
            )}
          </div>
          
          <button 
            onClick={handleAdd} 
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 shadow-sm ${
              added 
                ? 'bg-emerald-500 text-white' 
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
            }`}
            aria-label="Add to cart"
          >
            {added ? <Check className="w-4.5 h-4.5" /> : <ShoppingBag className="w-4 h-4 sm:w-4.5 sm:h-4.5" />}
          </button>
        </div>
      </div>
    </Link>
  );
};

// Featured Combo / Bundle Card
export const ComboCard = ({ product }: { product: Product }) => {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const imageSrc = getImageUrl(product.cover_image_path || product.image_url);
  const savings = product.original_price ? product.original_price - product.price : 0;
  const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.type === 'hardcopy';
  const detailUrl = isPhysical ? `/store/${product.slug}` : `/ebooks/${product.slug}`;

  return (
    <Link 
      href={detailUrl} 
      className="group block w-full bg-gradient-to-br from-emerald-800 to-teal-950 rounded-3xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 relative border border-emerald-900/50"
    >
      <div className="flex flex-col md:flex-row items-stretch">
        
        {/* Combo Image / Visual (Responsive image) */}
        <div className="w-full md:w-[35%] relative aspect-[16/9] md:aspect-auto bg-[#07362c] overflow-hidden min-h-[220px] p-4 flex items-center justify-center">
          {imageSrc ? (
            <div className="relative w-full h-full">
              <Image 
                src={imageSrc} 
                alt={product.title} 
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain group-hover:scale-[1.03] transition-transform duration-700 opacity-95"
                priority
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-3/4 h-3/4 flex -space-x-12 opacity-80 group-hover:-space-x-8 transition-all duration-500">
                <div className="w-3/5 h-full bg-[#085041] rounded-lg shadow-xl transform rotate-[-5deg] z-10 border border-white/10"></div>
                <div className="w-3/5 h-full bg-[#0C447C] rounded-lg shadow-xl transform rotate-[5deg] z-20 border border-white/10"></div>
                <div className="w-3/5 h-full bg-[#633806] rounded-lg shadow-xl transform rotate-[15deg] z-30 border border-white/10"></div>
              </div>
            </div>
          )}
          
          {/* Discount Badge */}
          {savings > 0 && (
            <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-950 px-3 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-lg flex items-center gap-1 border border-yellow-300 z-20">
              <Crown className="w-3.5 h-3.5" /> Save {formatPrice(savings)}
            </div>
          )}
        </div>

        {/* Combo Details */}
        <div className="w-full md:w-[65%] p-6 sm:p-8 lg:p-10 flex flex-col justify-center text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none"></div>
          
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="bg-white/10 text-emerald-200 border border-emerald-500/30 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
              Premium Bundle
            </span>
            <span className="text-white/60 text-xs font-semibold">
              {product.metadata?.books || 5}+ Books Included
            </span>
          </div>

          <h3 className="font-display text-xl sm:text-2xl lg:text-3xl font-extrabold mb-3 leading-tight relative z-10">
            {product.title}
          </h3>
          
          <p className="text-white/70 text-xs sm:text-sm mb-6 max-w-xl relative z-10 leading-relaxed line-clamp-3">
            {product.description}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-auto relative z-10 pt-4 border-t border-white/5">
            <div className="flex items-baseline gap-2.5">
              <span className="text-2xl sm:text-3xl font-black">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="text-base sm:text-lg text-white/40 line-through decoration-white/30">{formatPrice(product.original_price)}</span>
              )}
            </div>
            
            <button 
              onClick={handleAdd}
              className={`px-8 py-3.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 active:scale-95 ${
                added ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-900 hover:bg-emerald-50 hover:-translate-y-0.5'
              }`}
            >
              {added ? <><Check className="w-4 h-4"/> Added to Cart</> : 'Buy Bundle Now'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
};
