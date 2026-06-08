"use server";

import { createAdminClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { BRAND } from "@/lib/constants";

export async function saveProductAction(payload: any, productId?: string) {
  try {
    const supabase = createAdminClient();

    if (productId) {
      const { error } = await supabase
        .from("mt_ebooks")
        .update({
          title: payload.title,
          description: payload.description,
          price: payload.price,
          image_url: payload.cover_image_path,
          is_active: payload.status === 'PUBLISHED',
        })
        .eq("id", productId);
        
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("mt_ebooks")
        .insert([{
          title: payload.title,
          slug: payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
          description: payload.description,
          price: payload.price,
          image_url: payload.cover_image_path,
          is_active: payload.status === 'PUBLISHED',
          clinic_id: BRAND.clinicId
        }]);
        
      if (error) throw error;
    }

    // Crucial: Clear storefront caches so changes are immediately visible
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
