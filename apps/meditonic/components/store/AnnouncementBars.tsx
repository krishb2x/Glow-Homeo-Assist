import React from 'react';
import { fetchGlobalAnnouncementBars } from '@/lib/cms';
import AnnouncementBarsClient from './AnnouncementBarsClient';

export async function AnnouncementBars() {
  const bars = await fetchGlobalAnnouncementBars();

  if (!bars || bars.length === 0) return null;

  return <AnnouncementBarsClient bars={bars} />;
}
