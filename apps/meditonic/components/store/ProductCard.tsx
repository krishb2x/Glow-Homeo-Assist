"use client";

import React, { useState } from "react";
import { Product } from "@/types/store";
import { useStore } from "./StoreProvider";
import { Crown, Truck, BookOpen, Check } from "lucide-react";
import Image from "next/image";

export const ProductCard = ({ product }: { product: Product }) => {
  const { addToCart } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const isDiagnostic = product.category === 'diagnostic' || product.title.toLowerCase().includes('diagnostic');
  const isMedicine = product.category === 'medicine' || product.title.toLowerCase().includes('medicine');
  const isGyne = product.category === 'gyne_pedia' || product.title.toLowerCase().includes('gyne');

  const getSeriesColor = () => {
    if (isDiagnostic) return { bg: 'bg-[#085041]', light: 'bg-[#E1F5EE]', text: 'text-[#085041]' };
    if (isGyne) return { bg: 'bg-[#633806]', light: 'bg-[#faeeda]', text: 'text-[#633806]' };
    if (isMedicine) return { bg: 'bg-[#0C447C]', light: 'bg-[#e6f1fb]', text: 'text-[#0C447C]' };
    return { bg: 'bg-mt-primary', light: 'bg-mt-primary/10', text: 'text-mt-primary' };
  };

  const colors = getSeriesColor();

  // 1. Triple Bundle (Hero)
  if (product.slug === 'triple-bundle') {
    return (
      <div className="w-full bg-[#1B6B5C] rounded-2xl p-5 text-white shadow-lg relative overflow-hidden mb-6 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
        <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
          <Crown className="w-3 h-3 text-yellow-400" /> Best value · Save ₹{product.original_price! - product.price}
        </div>
        <h3 className="font-display text-2xl mb-1">{product.title}</h3>
        <p className="text-[11px] text-white/65 leading-tight mb-4 max-w-[80%]">{product.description}</p>
        
        <div className="flex items-center gap-1 mb-5">
          {[...Array(5)].map((_, i) => <div key={`d${i}`} className="w-3 h-8 bg-[#085041] rounded-sm opacity-80" />)}
          <div className="w-1" />
          {[...Array(5)].map((_, i) => <div key={`m${i}`} className="w-3 h-8 bg-[#0C447C] rounded-sm opacity-80" />)}
          <div className="w-1" />
          {[...Array(5)].map((_, i) => <div key={`g${i}`} className="w-3 h-8 bg-[#633806] rounded-sm opacity-80" />)}
          <span className="text-[10px] text-white/50 ml-2 font-bold">+15 books</span>
        </div>

        <div className="flex items-end justify-between mt-auto">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">₹{product.price}</span>
              <span className="text-sm text-white/45 line-through">₹{product.original_price}</span>
            </div>
          </div>
          <button onClick={handleAdd} className="bg-white text-[#1B6B5C] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all shadow-sm flex items-center gap-2">
            {added ? <><Check className="w-4 h-4"/> Added</> : "Buy Now →"}
          </button>
        </div>
      </div>
    );
  }

  // 2. Hard Copy
  if (product.type === 'hardcopy') {
    return (
      <div className="w-full bg-white rounded-2xl p-4 border-[2px] border-[#1B6B5C] shadow-sm mb-4 relative overflow-hidden">
        <div className="flex justify-between items-start mb-2">
          <div className="inline-flex items-center gap-1.5 bg-[#1B6B5C] text-white px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            <Truck className="w-3 h-3" /> Physical · Home Delivery
          </div>
        </div>
        <h3 className="font-bold text-lg text-mt-text mb-1">{product.title}</h3>
        <p className="text-xs text-mt-text-secondary leading-tight mb-4">{product.description} Pan-India in 5–7 days.</p>
        
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-mt-text">₹{product.price}</span>
            {product.original_price && <span className="text-xs text-mt-text-secondary line-through">₹{product.original_price}</span>}
          </div>
          <button onClick={handleAdd} className="bg-[#1B6B5C] text-white px-4 py-2 rounded-lg font-bold text-sm active:scale-95 transition-all">
            {added ? "Added ✓" : "Buy →"}
          </button>
        </div>
      </div>
    );
  }

  // 3. Combos
  if (product.is_combo) {
    return (
      <div className="w-full bg-white rounded-2xl p-4 border border-mt-border shadow-sm flex items-center gap-4 mb-4">
        <div className={`w-12 h-16 shrink-0 ${colors.bg} rounded flex items-center justify-center shadow-inner relative overflow-hidden`}>
          <BookOpen className="w-5 h-5 text-white/50" />
          <div className="absolute bottom-0 w-full h-1/3 bg-black/20" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${colors.light} ${colors.text} mb-1`}>
            {product.category.replace('_', ' & ')} Series
          </div>
          <h3 className="font-bold text-sm text-mt-text truncate">{product.title}</h3>
          <p className="text-[10px] text-mt-text-secondary truncate mt-0.5">{product.metadata?.books || 5} Books included</p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-mt-text">₹{product.price}</span>
              <span className="text-[10px] text-mt-text-secondary line-through">₹{product.original_price}</span>
            </div>
            <button onClick={handleAdd} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${colors.light} ${colors.text} active:scale-95 transition-transform`}>
              {added ? "✓" : "Buy →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Individual Book
  return (
    <div className="w-full bg-white rounded-xl border border-mt-border overflow-hidden flex flex-col h-full">
      <div className={`w-full h-[90px] ${colors.bg} relative flex items-center justify-center overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 flex items-center justify-center">
          <BookOpen className="w-24 h-24 text-white" strokeWidth={1} />
        </div>
        <div className="absolute top-2 left-2 bg-black/20 backdrop-blur-md text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
          {product.category.replace('_', ' ')}
        </div>
        <BookOpen className="w-8 h-8 text-white relative z-10" />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-xs font-bold text-mt-text leading-tight mb-1 line-clamp-2">{product.title}</h3>
        <p className="text-[10px] text-mt-text-secondary mb-3">{product.metadata?.pages || 0} pages · PDF</p>
        
        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-[#1B6B5C]">₹{product.price}</span>
            {product.original_price && <span className="text-[9px] text-mt-text-tertiary line-through -mt-0.5">₹{product.original_price}</span>}
          </div>
          <button onClick={handleAdd} className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all active:scale-95 ${added ? 'bg-mt-success text-white' : 'bg-[#E1F5EE] text-[#085041]'}`}>
            {added ? "Added ✓" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};
