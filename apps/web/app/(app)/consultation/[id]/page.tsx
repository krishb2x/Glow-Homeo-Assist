"use client";

import { useParams } from "next/navigation";
import { LiveConsultationClient } from "../../../../components/clinic/LiveConsultationClient";

export default function LiveConsultationPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  if (!id) {
    return <p className="text-sm text-gh-muted">Invalid consultation.</p>;
  }
  return <LiveConsultationClient id={id} />;
}
