"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND, TREATMENT_CATEGORIES } from "@/lib/constants";
import { Mail, MapPin, Phone } from "lucide-react";

/* Inline social SVGs — lucide-react dropped social icons in v0.300+ */
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

  const isDashboardRoute = pathname.startsWith('/admin') || pathname.startsWith('/partner-dashboard') || pathname.startsWith('/partner-login') || pathname.startsWith('/ebooks');
  if (isDashboardRoute) return null;

  return (
    <footer className="mt-auto border-t border-mt-border bg-white pt-16 pb-8">
      <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          {/* Column 1: Brand & Contact */}
          <div className="flex flex-col gap-6">
            <div>
              <Link href="/" className="font-display text-2xl font-bold text-mt-primary">
                {BRAND.name}
              </Link>
              <p className="mt-2 text-sm text-mt-text-secondary">{BRAND.tagline}</p>
            </div>
            
            <div className="flex flex-col gap-3 text-sm text-mt-text-secondary">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-mt-primary" />
                <span>{BRAND.phone}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <a href={BRAND.social.instagram_meditonic} target="_blank" rel="noopener noreferrer" className="text-[#E1306C] hover:opacity-80 transition-opacity" aria-label="Instagram">
                <InstagramIcon className="h-6 w-6" />
              </a>
              <a href={BRAND.social.youtube_meditonic} target="_blank" rel="noopener noreferrer" className="text-[#FF0000] hover:opacity-80 transition-opacity" aria-label="YouTube">
                <YoutubeIcon className="h-6 w-6" />
              </a>
            </div>
          </div>



          {/* Column 3: Treatments */}
          <div>
            <h3 className="mb-6 font-display text-lg font-semibold text-mt-text">Treatments</h3>
            <ul className="flex flex-col gap-3 text-sm text-mt-text-secondary">
              {TREATMENT_CATEGORIES.map((treatment) => (
                <li key={treatment.slug}>
                  <Link href={`/treatments/${treatment.slug}`} className="hover:text-mt-primary">
                    {treatment.title}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/treatments" className="font-medium text-mt-primary hover:underline">
                  View All Treatments &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Learn */}
          <div>
            <h3 className="mb-6 font-display text-lg font-semibold text-mt-text">Learn</h3>
            <ul className="flex flex-col gap-3 text-sm text-mt-text-secondary">
              <li><Link href="/ebooks" className="hover:text-mt-primary text-mt-primary font-medium">Buy eBooks</Link></li>
              <li><Link href="/videos" className="hover:text-mt-primary">Video Library</Link></li>
              <li className="mt-4"><Link href="/privacy" className="hover:text-mt-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-mt-primary">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 border-t border-mt-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-mt-text-tertiary">
          <p>&copy; {currentYear} {BRAND.name}. All rights reserved.</p>
          <p className="text-xs">
            Powered by <a href="#" className="font-semibold hover:text-mt-primary transition-colors">GlowHomeo</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
