import React from "react";
import ProductForm from "../ProductForm";
import { createAdminClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const supabase = createAdminClient();
  
  const { data: product, error } = await supabase
    .from("mt_products")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (error || !product) {
    notFound();
  }

  // Fetch relationships
  const { data: relationships } = await supabase
    .from("mt_product_relationships")
    .select("related_product_id, relationship_type")
    .eq("product_id", product.id);

  if (relationships) {
    product.related_product_ids = relationships
      .filter((r: any) => r.relationship_type === 'upsell')
      .map((r: any) => r.related_product_id);
      
    product.bundle_item_ids = relationships
      .filter((r: any) => r.relationship_type === 'bundle_item')
      .map((r: any) => r.related_product_id);
  }

  return <ProductForm initialData={product} />;
}
