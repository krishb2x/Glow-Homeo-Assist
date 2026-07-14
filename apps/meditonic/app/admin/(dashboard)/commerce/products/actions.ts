"use server";

import { createAdminClient } from "../../../../../lib/supabase";
import { revalidatePath } from "next/cache";
import { BRAND } from "../../../../../lib/constants";

export async function saveProductAction(payload: any, productId?: string) {
  try {
    const supabase = createAdminClient();

      const productType = payload.product_type || 'EBOOK';
      const hasDigitalUploads = ['EBOOK', 'PROGRAM', 'COURSE'].includes(productType);
      
      const fulfillmentTypeMap: Record<string, string> = {
        EBOOK: 'DIGITAL_DOWNLOAD',
        PHYSICAL_BOOK: 'PHYSICAL_SHIPPING',
        CONSULTATION: 'BOOKING',
        PROGRAM: 'DIGITAL_DOWNLOAD',
        COURSE: 'LMS_ACCESS',
        MEMBERSHIP: 'LMS_ACCESS',
        BUNDLE: 'DIGITAL_DOWNLOAD',
        TREATMENT_KIT: 'PHYSICAL_SHIPPING',
      };
      
      const fulfillmentType = payload.fulfillment_type || fulfillmentTypeMap[productType] || 'DIGITAL_DOWNLOAD';

      const metadata: any = {
        ...(payload.metadata || {}),
        gallery_image_paths: payload.gallery_image_paths || [],
        meta_title: payload.meta_title || "",
        meta_description: payload.meta_description || "",
        fulfillment_type: fulfillmentType,
        
        // Recoverable Metadata
        pages: payload.metadata?.pages || undefined,
        books: payload.metadata?.books || undefined,
        author: payload.metadata?.author || undefined,
        language: payload.metadata?.language || undefined,
        format: payload.metadata?.format || undefined,
        duration: payload.metadata?.duration || undefined,
        modality: payload.metadata?.modality || undefined,
      };

      if (hasDigitalUploads) {
        metadata.preview_pdf_path = payload.preview_pdf_path || "";
        metadata.final_pdf_path = payload.final_pdf_path || "";
      } else {
        delete metadata.preview_pdf_path;
        delete metadata.final_pdf_path;
        delete metadata.requires_watermark;
      }

      const commonFields = {
        title: payload.title,
        slug: payload.slug || payload.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        description: payload.description,
        price: payload.price,
        original_price: payload.original_price || payload.price,
        cover_image_path: payload.cover_image_path,
        
        // New Merchandising Columns
        is_active: payload.is_active,
        display_order: payload.display_order || 999,
        is_featured: payload.is_featured || false,
        is_bestseller: payload.is_bestseller || false,
        is_new_release: payload.is_new_release || false,
        is_bundle: payload.is_bundle || false,
        category: payload.category || "",

        // Shipping dimensions & logistics configuration
        weight_grams: payload.weight_grams ?? 500,
        length_cm: payload.length_cm ?? 15,
        width_cm: payload.width_cm ?? 15,
        height_cm: payload.height_cm ?? 5,
        hsn_code: payload.hsn_code || null,
        cod_allowed: payload.cod_allowed ?? true,
        partial_cod_allowed: payload.partial_cod_allowed ?? false,
        partial_cod_amount: payload.partial_cod_amount ?? 0,
        bypass_shipping_check: payload.bypass_shipping_check ?? false,

        // Core Classification
        product_type: productType,
        fulfillment_type: fulfillmentType,
        is_combo: productType === 'BUNDLE' || payload.is_bundle,
        
        metadata: metadata
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

      // Handle Bundle Items
      if (commonFields.is_combo) {
        await supabase
          .from("mt_product_relationships")
          .delete()
          .eq("product_id", targetProductId)
          .eq("relationship_type", "bundle_item");

        if (payload.bundle_item_ids && payload.bundle_item_ids.length > 0) {
          const bundleRels = payload.bundle_item_ids.map((relId: string, idx: number) => ({
            product_id: targetProductId,
            related_product_id: relId,
            relationship_type: "bundle_item",
            sort_order: idx
          }));

          const { error: bundleError } = await supabase
            .from("mt_product_relationships")
            .insert(bundleRels);
            
          if (bundleError) console.error("Failed to save bundle items", bundleError);
        }
      }

      // Handle FBT Items
      await supabase
        .from("mt_product_relationships")
        .delete()
        .eq("product_id", targetProductId)
        .eq("relationship_type", "frequently_bought_together");

      if (payload.fbt_product_ids && payload.fbt_product_ids.length > 0) {
        const fbtRels = payload.fbt_product_ids.map((relId: string, idx: number) => ({
          product_id: targetProductId,
          related_product_id: relId,
          relationship_type: "frequently_bought_together",
          sort_order: idx
        }));

        const { error: fbtError } = await supabase
          .from("mt_product_relationships")
          .insert(fbtRels);
          
        if (fbtError) console.error("Failed to save FBT items", fbtError);
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
