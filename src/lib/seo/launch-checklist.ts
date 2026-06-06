import { ALL_SITEMAP_PATHS } from "@/lib/seo/routes";
import { getSiteUrl } from "@/lib/seo/site-config";

export const INDEXABLE_PUBLIC_PATHS = ALL_SITEMAP_PATHS;

export const NON_INDEXABLE_PATHS = [
  "/admin",
  "/admin/activity",
  "/admin/seo-checklist",
  "/api/leads",
  "/api/admin/leads",
  "/result",
  "/thank-you",
] as const;

export const KEY_SEO_ROUTES = [
  "/tools",
  "/tools/home-match",
  "/tools/seller-strategy",
  "/tools/equity-move-up",
  "/tools/wealth-forecast",
  "/guides/sell-first-or-buy-first-orange-county",
  "/guides/buying-after-a-liquidity-event",
  "/guides/orange-county-equity-move-up",
  "/areas/irvine",
  "/areas/newport-beach",
] as const;

export function getLaunchChecklistUrls() {
  const siteUrl = getSiteUrl();
  return {
    siteUrl,
    sitemapUrl: `${siteUrl}/sitemap.xml`,
    robotsUrl: `${siteUrl}/robots.txt`,
  };
}

export function getStructuredDataTestUrl(pagePath: string): string {
  const siteUrl = getSiteUrl();
  return `https://search.google.com/test/rich-results?url=${encodeURIComponent(`${siteUrl}${pagePath}`)}`;
}

export const SEARCH_CONSOLE_SETUP_STEPS = [
  "Add the production property in Google Search Console.",
  "Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION in Vercel to the meta tag content value.",
  "Redeploy, then click Verify in Search Console.",
  "Submit the sitemap URL after verification succeeds.",
  "Monitor Coverage and Enhancements for FAQ and breadcrumb rich results.",
] as const;
