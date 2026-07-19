/* 📚 MediTonic Brand Constants 📚 */

export const BRAND = {
  name: "MediTonic",
  tagline: "Premium Books & Bundles to Expand Your Knowledge",
  doctor: "Aman Agrawal",
  qualification: "Author & Publisher",
  experience: "",
  email: "support@meditonic.com",
  phone: "+91-7599651592",
  whatsapp: "+91-7599651592",
  address: "",
  city: "India",
  social: {
    youtube_meditonic: "https://www.youtube.com/@MediTonicDrAmanAgarwal",
    youtube_personal: "https://www.youtube.com/@draman_agarwal",
    instagram_meditonic: "https://www.instagram.com/meditonic_dr",
    instagram_personal: "https://www.instagram.com/dr_aman_agarwal",
  },
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  clinicId: process.env.MEDITONIC_CLINIC_ID || "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
} as const;

export type NavItem = {
  href: string;
  label: string;
  children?: { href: string; label: string }[];
};

export const NAV_LINKS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/store", label: "Physical Books" },
  { href: "/ebooks", label: "eBooks" },
  { href: "/store?category=bundles", label: "Bundles & Combos" },
  { href: "/about", label: "About Us" },
];
