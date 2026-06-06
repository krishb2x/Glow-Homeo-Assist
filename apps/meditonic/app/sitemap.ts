import { MetadataRoute } from "next";
import { BRAND, TREATMENT_CATEGORIES, BLOG_CATEGORIES } from "@/lib/constants";
import { DUMMY_BLOG_POSTS } from "@/lib/dummy-data";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BRAND.siteUrl;

  // Core static routes
  const routes = [
    "",
    "/about",
    "/treatments",
    "/consultations",
    "/ebooks",
    "/videos",
    "/success-stories",
    "/blog",
    "/contact",
    "/privacy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  // Dynamic Treatment Routes
  const treatmentRoutes = TREATMENT_CATEGORIES.map((treatment) => ({
    url: `${baseUrl}/treatments/${treatment.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));



  // Dynamic Blog Category Routes
  const blogCategoryRoutes = BLOG_CATEGORIES.map((category) => ({
    url: `${baseUrl}/blog/category/${category.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Dynamic Blog Post Routes
  const blogPostRoutes = DUMMY_BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.date).toISOString(), // Use dummy post date
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [
    ...routes,
    ...treatmentRoutes,
    ...blogCategoryRoutes,
    ...blogPostRoutes,
  ];
}
