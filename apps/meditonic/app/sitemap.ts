import { MetadataRoute } from "next";
import { BRAND } from "../lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BRAND.siteUrl;

  // Core static routes
  const routes = [
    "",
    "/about",
    "/store",
    "/ebooks",
    "/contact",
    "/privacy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  return [
    ...routes,
  ];
}
