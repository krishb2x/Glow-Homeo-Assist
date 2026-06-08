import React from "react";
import ProductForm from "../ProductForm";
import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  
  const { data: product, error } = await supabase
    .from("mt_ebooks")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !product) {
    notFound();
  }

  return <ProductForm initialData={product} />;
}
