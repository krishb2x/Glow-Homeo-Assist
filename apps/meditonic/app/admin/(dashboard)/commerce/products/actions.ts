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
      is_active: payload.status === 'PUBLISHED',
      category: payload.category,
      type: payload.product_type || 'EBOOK',
      is_combo: payload.product_type === 'BUNDLE' || payload.is_combo,
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

    if (productId) {
      const { error } = await supabase
        .from("mt_ebooks")
        .update(commonFields)
        .eq("id", productId);
        
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("mt_ebooks")
        .insert([{
          ...commonFields,
          clinic_id: BRAND.clinicId
        }]);
        
      if (error) throw error;
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
    console.error("Save product error:", error);
    return { success: false, error: error.message };
  }
}
