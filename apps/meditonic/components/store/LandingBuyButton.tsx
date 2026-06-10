"use client";

import React, { useState } from "react";
import { Product } from "../../types/store";
import { useStore } from "./StoreProvider";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

export default function LandingBuyButton({ product }: { product: Product }) {
  const { addToCart } = useStore();
  const searchParams = useSearchParams();
  const [added, setAdded] = useState(false);

  const utmSource = searchParams.get('utm_source') || undefined;
  const utmCampaign = searchParams.get('utm_campaign') || undefined;

  const handleBuy = () => {
    addToCart(product, utmSource, utmCampaign);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <button 
      onClick={handleBuy}
      className="w-full bg-[#1B6B5C] text-white py-4 rounded-xl font-bold text-lg active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
    >
      {added ? <><Check className="w-5 h-5"/> Added to Cart</> : `Buy Now for ₹${product.price}`}
    </button>
  );
}
