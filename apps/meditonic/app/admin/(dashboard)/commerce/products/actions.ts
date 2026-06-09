"use server";

import { createAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { BRAND } from "@/lib/constants";

export async function saveProductAction(payload: any, productId?: string) {
  try {
    const supabase = createAdminClient();

    const commonFields = {
      title: payload.title,
      slug: payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
      description: payload.description,
      price: payload.price,
      original_price: payload.original_price || payload.price,
      image_url: payload.cover_image_path,
      cover_image_path: payload.cover_image_path,
      
      // New Merchandising Columns
      is_active: payload.is_active,
      display_order: payload.display_order || 999,
      is_featured: payload.is_featured || false,
      is_bestseller: payload.is_bestseller || false,
      is_new_release: payload.is_new_release || false,
      is_bundle: payload.is_bundle || false,
      category: payload.category || null,

      // Legacy support mappings
      type: payload.product_type || 'EBOOK',
      is_combo: payload.product_type === 'BUNDLE' || payload.is_bundle,
      
      metadata: {
        ...(payload.metadata || {}),
        gallery_image_paths: payload.gallery_image_paths || [],
        preview_pdf_path: payload.preview_pdf_path || "",
        final_pdf_path: payload.final_pdf_path || "",
        meta_title: payload.meta_title || "",
        meta_description: payload.meta_description || "",
        fulfillment_type: payload.fulfillment_type || "DIGITAL_DOWNLOAD"
      }
    };

    let targetProductId = productId;

    if (productId) {
      const { error } = await supabase
        .from("mt_products")
        .update(commonFields)
        .eq("id", productId);
        
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("mt_products")
        .insert([{
          ...commonFields,
          clinic_id: BRAND.clinicId
        }])
        .select("id")
        .single();
        
      if (error) throw error;
      targetProductId = data.id;
    }

    // Handle Relationships (Upsells)
    if (targetProductId) {
      // First, clear existing upsells
      await supabase
        .from("mt_product_relationships")
        .delete()
        .eq("product_id", targetProductId)
        .eq("relationship_type", "upsell");

      // Then insert new ones
      if (payload.related_product_ids && payload.related_product_ids.length > 0) {
        const relationships = payload.related_product_ids.map((relId: string, idx: number) => ({
          product_id: targetProductId,
          related_product_id: relId,
          relationship_type: "upsell",
          sort_order: idx
        }));

        const { error: relError } = await supabase
          .from("mt_product_relationships")
          .insert(relationships);
          
        if (relError) console.error("Failed to save relationships", relError);
      }
    }

    // Crucial: Clear storefront caches so changes are immediately visible
    revalidatePath(`/ebooks/${commonFields.slug}`, "page");
    revalidatePath(`/store/${commonFields.slug}`, "page");
    revalidatePath("/ebooks", "layout");
    revalidatePath("/store", "layout");
    revalidatePath("/", "layout");
    revalidatePath("/admin/commerce/products", "page");

    return { success: true };
  } catch (error: any) {
    console.error("Save Error:", error);
    return { success: false, error: error.message };
  }
}
