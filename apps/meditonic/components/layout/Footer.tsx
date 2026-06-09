"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, TREATMENT_CATEGORIES } from "@/lib/constants";
import { Mail, ChevronDown } from "lucide-react";

/* Inline social SVGs */
const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);
const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" />
  </svg>
);


export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  
  // Accordion state for mobile
  const [openSection, setOpenSection] = useState<string | null>(null);

  const isDashboardRoute = pathname.startsWith('/admin') || pathname.startsWith('/partner-dashboard') || pathname.startsWith('/partner-login');
  if (isDashboardRoute) return null;

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  return (
    <footer className="mt-auto border-t border-mt-border bg-white pt-10 md:pt-16 pb-28 md:pb-8">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:gap-12 lg:grid-cols-4">
          
          {/* Column 1: Brand & Socials (Always visible at top) */}
          <div className="flex flex-col gap-5 lg:col-span-2">
            <div>
              <Link href="/" className="font-display text-2xl font-bold text-mt-primary">
                {BRAND.name}
              </Link>
              <p className="mt-2 text-sm text-mt-text-secondary pr-4 md:pr-12 leading-relaxed">
                {BRAND.tagline}. Discover holistic healing and digital resources curated by Dr. Aman Agrawal.
              </p>
            </div>
            
            <div className="flex flex-col gap-3 text-sm text-mt-text-secondary">
              <a href={`mailto:${BRAND.email}`} className="flex items-center gap-2 hover:text-mt-primary transition-colors w-fit">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{BRAND.email}</span>
              </a>
              <Link href="/book-consultation" className="text-sm font-semibold text-mt-primary hover:underline w-fit">
                Book a Consultation &rarr;
              </Link>
            </div>

            <div className="flex gap-4 pt-2">
              <a href={BRAND.social.instagram_meditonic} target="_blank" rel="noopener noreferrer" className="text-[#E1306C] hover:scale-110 transition-transform" aria-label="Instagram">
                <InstagramIcon className="h-6 w-6" />
              </a>
              <a href={BRAND.social.youtube_meditonic} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:scale-110 transition-transform" aria-label="YouTube">
                <YoutubeIcon className="h-6 w-6" />
              </a>
            </div>
          </div>

          {/* Column 2: Treatments (Accordion on Mobile) */}
          <div className="border-t border-slate-100 md:border-none pt-4 md:pt-0">
            <button 
              onClick={() => toggleSection('treatments')}
              className="flex w-full items-center justify-between font-display text-lg font-semibold text-mt-text md:mb-6 md:cursor-default"
            >
              Treatments
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform md:hidden ${openSection === 'treatments' ? 'rotate-180' : ''}`} />
            </button>
            <ul className={`mt-4 flex-col gap-3 text-sm text-mt-text-secondary md:flex ${openSection === 'treatments' ? 'flex' : 'hidden'}`}>
              {TREATMENT_CATEGORIES.map((treatment) => (
                <li key={treatment.slug}>
                  <Link href={`/treatments/${treatment.slug}`} className="hover:text-mt-primary block py-1 md:py-0">
                    {treatment.title}
                  </Link>
                </li>
              ))}
              <li className="pt-2 md:pt-0">
                <Link href="/treatments" className="font-semibold text-mt-primary hover:underline">
                  View All Treatments &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Learn & Legal (Accordion on Mobile) */}
          <div className="border-t border-slate-100 md:border-none pt-4 md:pt-0">
            <button 
              onClick={() => toggleSection('learn')}
              className="flex w-full items-center justify-between font-display text-lg font-semibold text-mt-text md:mb-6 md:cursor-default"
            >
              Explore
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform md:hidden ${openSection === 'learn' ? 'rotate-180' : ''}`} />
            </button>
            <ul className={`mt-4 flex-col gap-3 text-sm text-mt-text-secondary md:flex ${openSection === 'learn' ? 'flex' : 'hidden'}`}>
              <li><Link href="/ebooks" className="hover:text-mt-primary text-mt-primary font-semibold block py-1 md:py-0">eBook Store</Link></li>
              <li><Link href="/videos" className="hover:text-mt-primary block py-1 md:py-0">Video Library</Link></li>
              <li><Link href="/success-stories" className="hover:text-mt-primary block py-1 md:py-0">Success Stories</Link></li>
              <li className="mt-2 md:mt-4"><Link href="/privacy" className="hover:text-mt-primary block py-1 md:py-0">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-mt-primary block py-1 md:py-0">Terms & Conditions</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Credit */}
        <div className="mt-12 md:mt-16 border-t border-mt-border pt-8 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-mt-text-tertiary text-center md:text-left">
          <p>&copy; {currentYear} {BRAND.name}. All rights reserved.</p>
          <p className="text-xs">
            Powered by <a href="#" className="font-semibold hover:text-mt-primary transition-colors">GlowHomeo</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
