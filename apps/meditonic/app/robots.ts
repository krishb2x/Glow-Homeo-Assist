import { MetadataRoute } from "next";
import { BRAND } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/payment-success", "/ebook-order-success"],
    },
    sitemap: `${BRAND.siteUrl}/sitemap.xml`,
  };
}
