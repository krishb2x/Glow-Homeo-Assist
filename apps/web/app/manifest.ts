import type { MetadataRoute } from "next";
import { BRAND_NAME } from "../lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} | Homeopathy Clinic Software`,
    short_name: BRAND_NAME,
    description:
      "The clinical operating system for homeopathy doctors. Structured consultations, prescription management, telemedicine, and a branded patient app.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0E7C66",
    categories: ["medical", "health", "productivity"],
    lang: "en-IN",
    dir: "ltr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      { src: "/apple-icon.svg", sizes: "180x180", type: "image/svg+xml" }
    ]
  };
}
