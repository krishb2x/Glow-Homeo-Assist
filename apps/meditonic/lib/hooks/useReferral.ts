"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export function useReferral() {
  const searchParams = useSearchParams();
  const [referralCode, setReferralCode] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check URL for ?ref=CODE
    const urlRef = searchParams.get("ref");
    if (urlRef) {
      setReferralCode(urlRef.toUpperCase());
      localStorage.setItem("mt_referral_code", urlRef.toUpperCase());
      return;
    }

    // 2. Check local storage
    const storedRef = localStorage.getItem("mt_referral_code");
    if (storedRef) {
      setReferralCode(storedRef);
    }
  }, [searchParams]);

  const clearReferral = () => {
    localStorage.removeItem("mt_referral_code");
    setReferralCode(null);
  };

  return { referralCode, clearReferral };
}
