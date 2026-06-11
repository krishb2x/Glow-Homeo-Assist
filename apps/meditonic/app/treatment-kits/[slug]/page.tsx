import { notFound } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase";
import TreatmentKitClient from "./TreatmentKitClient";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  
  const { data: product } = await supabase
    .from("mt_products")
    .select("title, description")
    .eq("slug", resolvedParams.slug)
    .eq("product_type", "TREATMENT_KIT")
    .single();

  if (!product) {
    return {
      title: "Treatment Kit - MediTonic",
    };
  }

  return {
    title: `${product.title} Assessment - MediTonic`,
    description: product.description?.substring(0, 160),
  };
}

export default async function TreatmentKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  
  const { data: product, error } = await supabase
    .from("mt_products")
    .select("*")
    .eq("slug", resolvedParams.slug)
    .eq("product_type", "TREATMENT_KIT")
    .single();

  if (error || !product) {
    notFound();
  }

  return (
    <TreatmentKitClient product={product} />
  );
}
