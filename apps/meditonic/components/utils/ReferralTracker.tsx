"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ReferralTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      // Store it in localStorage
      localStorage.setItem("mt_referral_code", ref.toUpperCase());
    }
  }, [searchParams]);

  return null;
}
