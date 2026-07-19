export type ProductType = 'EBOOK' | 'PHYSICAL_BOOK' | 'BUNDLE';
export type FulfillmentType = 'DIGITAL_DOWNLOAD' | 'PHYSICAL_SHIPPING';
export type ProductStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type FulfillmentStatus = 'unfulfilled' | 'partial' | 'fulfilled';

export interface Product {
  id: string;
  clinic_id: string;
  slug: string;
  title: string;
  description: string;
  product_type: ProductType;
  fulfillment_type: FulfillmentType;
  price: number;
  original_price?: number;
  category: string;
  audience?: string;
  meta_title?: string;
  meta_description?: string;
  status: ProductStatus;
  metadata?: {
    gallery_image_paths?: string[];
    preview_pdf_path?: string;
    final_pdf_path?: string;
    preview_video_url?: string;
    requires_watermark?: boolean;
    pages?: number | string;
    books?: number | string;
    author?: string;
    language?: string;
    format?: string;
    duration?: number | string;
    modality?: string;
    custom_badge?: string;
    bestseller?: boolean;
    rating?: number;
    verified_reviews?: any[];
    key_learnings?: string[];
    [key: string]: any;
  };
  cover_image_path?: string;
  gallery_image_paths?: string[];
  preview_pdf_path?: string;
  final_pdf_path?: string;
  is_active: boolean;
  display_order: number;
  is_featured: boolean;
  is_bestseller: boolean;
  is_new_release: boolean;
  is_bundle: boolean;
  is_combo: boolean;
  combo_includes?: any;
  stock_status?: string;
  delivery_method?: string;
  created_at: string;
  updated_at: string;
  // Temporary legacy mapping to prevent breaking existing UI until they are fully migrated
  type?: string;
  image_url?: string;
  weight_grams?: number;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  hsn_code?: string;
  cod_allowed?: boolean;
  partial_cod_allowed?: boolean;
  partial_cod_amount?: number;
  bypass_shipping_check?: boolean;
  related_product_ids?: string[];
  bundle_item_ids?: string[];
  fbt_product_ids?: string[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  utm_source?: string;
  utm_campaign?: string;
}

export interface Order {
  id: string;
  clinic_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  total_amount: number;
  status: OrderStatus;
  fulfillment_status: FulfillmentStatus;
  utm_source?: string;
  utm_campaign?: string;
  items: CartItem[];
  audit_log: any[];
  created_at: string;
  updated_at: string;
}
