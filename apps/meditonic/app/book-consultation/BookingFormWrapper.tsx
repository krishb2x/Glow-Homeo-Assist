"use client";

import { useSearchParams } from "next/navigation";
import BookingForm from "@/components/forms/BookingForm";

export default function BookingFormWrapper({ fees }: { fees: any[] }) {
  const searchParams = useSearchParams();
  const concern = searchParams.get("concern") || "";

  return <BookingForm initialConcern={concern} fees={fees} />;
}
