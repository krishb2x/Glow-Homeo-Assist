"use client";

import React from 'react';
import { LandingPage, LandingPageSection } from '@/types/cms';
import { HeroBanner } from '../sections/HeroBanner';
import { TrustStrip } from '../sections/TrustStrip';
import { CategoryGrid } from '../sections/CategoryGrid';
import { CTABand } from '../sections/CTABand';

export function LandingPageRenderer({ page }: { page: LandingPage }) {
  // If the page has no sections or is empty, we can render a fallback or just empty.
  const sections = (page as any).sections as LandingPageSection[] || [];

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-4">Store is being updated</h1>
        <p className="text-gray-500">We are currently curating our book selection. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50/30">
      {sections.map((section) => (
        <DynamicSection key={section.id} section={section} />
      ))}
    </div>
  );
}

function DynamicSection({ section }: { section: LandingPageSection }) {
  // Map the section slug to our components
  switch (section.slug) {
    case 'hero':
      // Passing CMS data as props; the component needs to handle it.
      // For now, we fallback to our existing components or pass data if they support it.
      return <HeroBanner cmsData={section} />;
      
    case 'trust-strip':
      return <TrustStrip cmsData={section} />;
      
    case 'categories':
      return <CategoryGrid cmsData={section} />;
      
    case 'cta-band':
    case 'newsletter':
      return <CTABand cmsData={section} />;
      
    // Add other cases like 'best-sellers', 'reviews', 'youtube' as needed
    // using existing components and passing `cmsData`.
    default:
      console.warn(`No component mapped for section slug: ${section.slug}`);
      return null;
  }
}
