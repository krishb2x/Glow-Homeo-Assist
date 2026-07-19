export type MediaItem = {
  id: string;
  clinic_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  folder_path: string;
  alt_text?: string | null;
  tags?: string[] | null;
  width?: number | null;
  height?: number | null;
  created_at: string;
  updated_at: string;
};

export type LandingPage = {
  id: string;
  clinic_id: string;
  slug: string;
  title: string;
  seo_title?: string | null;
  meta_description?: string | null;
  og_image_id?: string | null;
  canonical_url?: string | null;
  index_status?: string | null;
  status: 'Draft' | 'Published' | 'Scheduled';
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type CtaBlock = {
  id: string;
  clinic_id: string;
  title: string;
  button_text: string;
  button_link: string;
  style: string;
  created_at: string;
  updated_at: string;
};

export type AnnouncementBar = {
  id: string;
  clinic_id: string;
  title: string;
  text: string;
  bg_color?: string | null;
  text_color?: string | null;
  link_url?: string | null;
  target_pages: string[];
  status: 'Draft' | 'Published' | 'Scheduled';
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type PromotionBanner = {
  id: string;
  clinic_id: string;
  title: string;
  content: any; // JSONB
  target_pages: string[];
  status: 'Draft' | 'Published' | 'Scheduled';
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type LandingPageSection = {
  id: string;
  page_id: string;
  slug: string;
  display_order: number;
  status: 'Draft' | 'Published' | 'Scheduled';
  settings?: any; // JSONB
  bg_image_id?: string | null;
  cta_block_id?: string | null;
  created_at: string;
  updated_at: string;
  items?: LandingPageItem[];
};

export type LandingPageItem = {
  id: string;
  section_id: string;
  display_order: number;
  status: 'Draft' | 'Published' | 'Scheduled';
  product_id?: string | null;
  category_id?: string | null;
  media_id_desktop?: string | null;
  media_id_mobile?: string | null;
  item_settings?: any; // JSONB
  created_at: string;
  updated_at: string;
};

export type Review = {
  id: string;
  clinic_id: string;
  product_id: string;
  reviewer_name: string;
  reviewer_photo_id?: string | null;
  rating: number;
  review_text: string;
  is_verified_purchase: boolean;
  status: 'Draft' | 'Published' | 'Scheduled';
  created_at: string;
  updated_at: string;
};
