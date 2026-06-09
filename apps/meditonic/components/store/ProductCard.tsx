"use client";

import React, { useState } from "react";
import { Product } from "@/types/store";
import { useStore } from "./StoreProvider";
import { Crown, Star, Check, ShoppingBag } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";

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

  const imageSrc = product.cover_image_path || product.image_url;
  const isPhysical = product.product_type === 'PHYSICAL_BOOK' || product.type === 'hardcopy';
  const formatBadge = isPhysical ? 'Physical Book' : 'Digital PDF';
  const rating = product.metadata?.rating || 5.0;

  return (
    <Link href={`/ebooks/${product.slug}`} className="group flex flex-col h-full bg-white rounded-2xl overflow-hidden border border-mt-border shadow-sm hover:shadow-xl transition-all duration-300">
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] w-full bg-mt-primary-bg overflow-hidden flex-shrink-0">
        {imageSrc ? (
          <img 
            src={imageSrc} 
            alt={product.title} 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 bg-white"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1B6B5C] to-[#0A3D33] flex items-center justify-center p-4">
            <span className="text-white/50 font-display text-2xl text-center leading-tight drop-shadow-md">
              {product.title}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {product.metadata?.bestseller && (
            <span className="bg-yellow-400 text-yellow-950 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm flex items-center gap-1">
              <Crown className="w-3 h-3" /> Bestseller
            </span>
          )}
          <span className="bg-black/40 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">
            {formatBadge}
          </span>
        </div>
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col flex-1">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex items-center text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-current" />
            ))}
          </div>
          <span className="text-xs text-mt-text-tertiary font-medium">{rating.toFixed(1)}</span>
        </div>

        {/* Title & Subtitle */}
        <h3 className="font-display text-[15px] font-bold text-mt-text leading-snug mb-1 group-hover:text-mt-primary transition-colors line-clamp-2">
          {product.title}
        </h3>
        {product.metadata?.subtitle && (
          <p className="text-xs text-mt-text-secondary line-clamp-2 mb-3">
            {product.metadata.subtitle}
          </p>
        )}

        {/* Pricing & Actions */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <div className="flex flex-col">
            <span className="text-base font-bold text-[#1B6B5C] leading-none">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-[11px] text-mt-text-tertiary line-through mt-0.5">{formatPrice(product.original_price)}</span>
            )}
          </div>
          
          <button 
            onClick={handleAdd} 
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 active:scale-90 ${
              added 
                ? 'bg-mt-success text-white' 
                : 'bg-mt-primary-bg text-mt-primary hover:bg-mt-primary hover:text-white'
            }`}
            aria-label="Add to cart"
          >
            {added ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
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

  const imageSrc = product.cover_image_path || product.image_url;
  const savings = product.original_price ? product.original_price - product.price : 0;

  return (
    <Link href={`/ebooks/${product.slug}`} className="group block w-full bg-[#1B6B5C] rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
      <div className="flex flex-col sm:flex-row items-stretch">
        {/* Combo Image / Visual */}
        <div className="w-full sm:w-[40%] relative aspect-[16/9] sm:aspect-auto bg-[#0A3D33] overflow-hidden">
          {imageSrc ? (
            <img 
              src={imageSrc} 
              alt={product.title} 
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 opacity-90 bg-[#0A3D33]"
            />
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
            <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-950 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Save {formatPrice(savings)}
            </div>
          )}
        </div>

        {/* Combo Details */}
        <div className="w-full sm:w-[60%] p-6 sm:p-8 lg:p-10 flex flex-col justify-center text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="bg-white/10 text-white border border-white/20 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest">
              Premium Bundle
            </span>
            <span className="text-white/60 text-xs font-medium">
              {product.metadata?.books || 5}+ Books Included
            </span>
          </div>

          <h3 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 leading-tight relative z-10">
            {product.title}
          </h3>
          
          <p className="text-white/70 text-sm sm:text-base mb-8 max-w-lg relative z-10 leading-relaxed">
            {product.description}
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mt-auto relative z-10">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl lg:text-4xl font-bold">{formatPrice(product.price)}</span>
              {product.original_price && (
                <span className="text-lg lg:text-xl text-white/40 line-through decoration-white/30">{formatPrice(product.original_price)}</span>
              )}
            </div>
            
            <button 
              onClick={handleAdd}
              className={`px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 shadow-xl flex items-center justify-center gap-2 active:scale-95 ${
                added ? 'bg-mt-success text-white' : 'bg-white text-[#1B6B5C] hover:bg-gray-50 hover:-translate-y-1'
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
