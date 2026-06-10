"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { BRAND } from "../../lib/constants";

export default function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);

  // Only show after scrolling down 300px
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 lg:hidden animate-slide-up">
      <Link
        href="/book-consultation"
        className="flex items-center gap-2 rounded-full bg-mt-primary px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-mt-primary-light active:scale-95 transition-all"
      >
        Book Now
      </Link>
      
      <a
        href={`https://wa.me/${BRAND.whatsapp.replace(/\D/g, "")}?text=Hello%20Dr.%20Aman,%20I%20would%20like%20to%20know%20more%20about%20your%20treatments.`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:bg-[#20bd5a] active:scale-95 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
