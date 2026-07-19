import React from 'react';
import { fetchGlobalPromotionBanners } from '@/lib/cms';

export async function PromotionBanners() {
  const banners = await fetchGlobalPromotionBanners();

  if (!banners || banners.length === 0) return null;

  // Render them based on their target_pages (for global we render the ones that apply site-wide).
  // E.g. placing at bottom of screen or floating, etc.
  
  return (
    <>
      {banners.map((banner) => (
        <div 
          key={banner.id} 
          className="fixed bottom-4 right-4 z-40 max-w-sm bg-white rounded-lg shadow-xl border border-mt-border p-4 animate-in slide-in-from-bottom"
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-mt-text-primary">{banner.title}</h4>
            <button className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          {banner.content?.description && (
            <p className="text-sm text-mt-text-secondary mb-3">{banner.content.description}</p>
          )}
          {banner.content?.button_text && (
            <a 
              href={banner.content.button_link || '#'}
              className="inline-block bg-mt-primary text-white text-xs font-semibold px-3 py-1.5 rounded"
            >
              {banner.content.button_text}
            </a>
          )}
        </div>
      ))}
    </>
  );
}
