import React from 'react';
import { fetchGlobalAnnouncementBars } from '@/lib/cms';

export async function AnnouncementBars() {
  const bars = await fetchGlobalAnnouncementBars();

  if (!bars || bars.length === 0) return null;

  return (
    <>
      {bars.map((bar) => (
        <div 
          key={bar.id} 
          className="text-center py-2 px-4 text-sm font-medium"
          style={{ 
            backgroundColor: bar.bg_color || '#1B6B5C', 
            color: bar.text_color || '#ffffff' 
          }}
        >
          {bar.link_url ? (
            <a href={bar.link_url} className="hover:opacity-80 transition-opacity">
              {bar.text}
            </a>
          ) : (
            <span>{bar.text}</span>
          )}
        </div>
      ))}
    </>
  );
}
