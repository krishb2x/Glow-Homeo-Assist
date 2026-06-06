"use client";

import { useSearchParams } from "next/navigation";
import BookingForm from "@/components/forms/BookingForm";

export default function BookingFormWrapper({ fees }: { fees: any[] }) {
  const searchParams = useSearchParams();
  const type = searchParams.get("type") || "initial_online";
  const concern = searchParams.get("concern") || "";

  return <BookingForm initialType={type} initialConcern={concern} fees={fees} />;
}
