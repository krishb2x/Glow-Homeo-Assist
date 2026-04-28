"use client";

import { useParams } from "next/navigation";
import { PrescriptionBuilderView } from "../../../../../components/clinic/prescription/PrescriptionBuilderView";

export default function PrescriptionPage(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  if (!id) {
    return <p className="text-stone-500">Invalid link.</p>;
  }

  return <PrescriptionBuilderView patientId={id} />;
}
