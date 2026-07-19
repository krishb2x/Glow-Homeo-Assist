import { createClient } from '@/lib/supabase-browser';
import { LandingPage, LandingPageSection, LandingPageItem, AnnouncementBar, PromotionBanner, CtaBlock } from '@/types/cms';

export async function fetchActiveHomepage(): Promise<LandingPage | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mt_landing_pages')
    .select(`
      *,
      sections:mt_landing_page_sections(
        *,
        cta_block:mt_cta_blocks(*),
        items:mt_landing_page_items(*)
      )
    `)
    .eq('slug', 'homepage')
    .eq('status', 'Published')
    .single();

  if (error || !data) return null;

  // Sort sections and items by display_order
  if (data.sections) {
    data.sections.sort((a: any, b: any) => a.display_order - b.display_order);
    data.sections.forEach((section: any) => {
      if (section.items) {
        section.items.sort((a: any, b: any) => a.display_order - b.display_order);
      }
    });
  }

  return data as unknown as LandingPage;
}

export async function fetchGlobalAnnouncementBars(): Promise<AnnouncementBar[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mt_announcement_bars')
    .select('*')
    .eq('status', 'Published')
    .or('target_pages.cs.{"all"},target_pages.cs.{"homepage"}');
    
  if (error || !data) return [];
  return data as AnnouncementBar[];
}

export async function fetchGlobalPromotionBanners(): Promise<PromotionBanner[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('mt_promotion_banners')
    .select('*')
    .eq('status', 'Published')
    .contains('target_pages', ['homepage']);
    
  if (error || !data) return [];
  return data as PromotionBanner[];
}
