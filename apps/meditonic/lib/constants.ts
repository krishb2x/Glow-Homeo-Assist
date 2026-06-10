/* ── MediTonic Brand Constants ───────────────────────────────────────────── */

export const BRAND = {
  name: "MediTonic",
  tagline: "Heal Naturally. Live Fully. Healing Beyond Symptoms: Restoring Health, Hormones, and Happiness",
  doctor: "Dr. Aman Agrawal",
  qualification: "BHMS + Aesthetic Medicine",
  experience: "6+ Years",
  email: "",
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
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
  clinicId: process.env.MEDITONIC_CLINIC_ID || "595cd444-e89c-4d1f-b31f-27f76f59e0d7",
} as const;



export const TREATMENT_CATEGORIES = [
  {
    slug: "depression-anxiety",
    title: "Depression & Anxiety",
    icon: "Brain",
    shortDesc: "Natural relief from depression, generalized anxiety, panic attacks, social anxiety, and OCD through constitutional homeopathic care.",
    conditions: ["Clinical Depression", "Generalized Anxiety", "Panic Attacks", "Social Anxiety", "OCD"],
  },
  {
    slug: "sleep-disorders",
    title: "Sleep Disorders",
    icon: "Moon",
    shortDesc: "Holistic treatment for insomnia, disturbed sleep patterns, restless nights, and chronic sleep deprivation.",
    conditions: ["Insomnia", "Disturbed Sleep", "Sleep Apnea", "Restless Sleep", "Nightmares"],
  },
  {
    slug: "stress-burnout",
    title: "Stress & Burnout",
    icon: "Flame",
    shortDesc: "Comprehensive care for chronic stress, workplace burnout, fatigue, irritability, and tension headaches.",
    conditions: ["Chronic Stress", "Burnout", "Fatigue", "Irritability", "Tension Headaches"],
  },
  {
    slug: "pcod-pcos",
    title: "PCOD / PCOS",
    icon: "Heart",
    shortDesc: "Effective homeopathic management of polycystic ovaries, irregular periods, hormonal acne, and weight concerns.",
    conditions: ["Polycystic Ovaries", "Irregular Periods", "Acne from PCOS", "Weight Gain", "Hirsutism"],
  },
  {
    slug: "thyroid",
    title: "Thyroid Disorders",
    icon: "Activity",
    shortDesc: "Natural support for hypothyroidism, hyperthyroidism, Hashimoto's, thyroid nodules, and TSH imbalance.",
    conditions: ["Hypothyroid", "Hyperthyroid", "Hashimoto's", "Thyroid Nodules", "TSH Imbalance"],
  },
  {
    slug: "hormonal-imbalance",
    title: "Hormonal Imbalance",
    icon: "Sparkles",
    shortDesc: "Restore hormonal harmony — treatment for menstrual irregularities, PMS, menopause, and mood swings.",
    conditions: ["Menstrual Irregularities", "PMS", "Menopause", "Adrenal Fatigue", "Mood Swings"],
  },
] as const;



export const BLOG_CATEGORIES = [
  { slug: "mental-health", label: "Mental Health" },
  { slug: "hormonal-health", label: "Hormonal Health" },
  { slug: "sleep-stress", label: "Sleep & Stress" },
  { slug: "lifestyle", label: "Lifestyle" },
  { slug: "homeopathy", label: "Homeopathy" },
  { slug: "nutrition", label: "Nutrition" },
] as const;

export const VIDEO_CATEGORIES = [
  { slug: "all", label: "All" },
  { slug: "mental-health", label: "Mental Health" },
  { slug: "hormonal-health", label: "Hormonal Health" },
  { slug: "stress", label: "Stress" },
  { slug: "sleep", label: "Sleep" },
  { slug: "lifestyle", label: "Lifestyle" },
] as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  {
    href: "/treatments",
    label: "Treatments",
    children: TREATMENT_CATEGORIES.map((t) => ({
      href: `/treatments/${t.slug}`,
      label: t.title,
    })),
  },

  {
    href: "/ebooks",
    label: "Buy eBooks",
  },
  { href: "/about", label: "About" },
] as const;
