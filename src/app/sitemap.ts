import type { MetadataRoute } from "next";
import { ALL_SITEMAP_PATHS } from "@/lib/seo/routes";
import { getSiteUrl } from "@/lib/seo/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return ALL_SITEMAP_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path.startsWith("/tools") ? 0.9 : 0.8,
  }));
}
