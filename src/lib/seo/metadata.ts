import type { Metadata } from "next";
import type { SeoPageContent, ToolsIndexContent } from "@/lib/seo/types";
import { getSiteUrl, SITE_NAME } from "@/lib/seo/site-config";

export function buildSeoMetadata(
  page: SeoPageContent | ToolsIndexContent
): Metadata {
  const siteUrl = getSiteUrl();

  return {
    title: page.title,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      type: "website",
      url: `${siteUrl}${page.path}`,
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
    alternates: {
      canonical: `${siteUrl}${page.path}`,
    },
  };
}

export function formatPageTitle(title: string): string {
  return `${title} | ${SITE_NAME}`;
}
