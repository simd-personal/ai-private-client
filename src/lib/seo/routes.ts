import { allAreaPages } from "@/lib/seo/content/areas";
import { allGuidePages } from "@/lib/seo/content/guides";
import {
  homeMatchToolPage,
  equityMoveUpToolPage,
  sellerStrategyToolPage,
  toolsIndexPage,
  wealthForecastToolPage,
  toolPages,
} from "@/lib/seo/content/tools";
import type { SeoPageContent } from "@/lib/seo/types";

export const PUBLIC_MARKETING_PATHS = [
  "/",
  "/buyer",
  "/seller",
  "/equity",
  "/wealth-forecast",
] as const;

export const SEO_CONTENT_PAGES: SeoPageContent[] = [
  ...Object.values(toolPages),
  ...allGuidePages,
  ...allAreaPages,
];

export const ALL_SITEMAP_PATHS: string[] = [
  ...PUBLIC_MARKETING_PATHS,
  toolsIndexPage.path,
  ...SEO_CONTENT_PAGES.map((page) => page.path),
];

export {
  toolsIndexPage,
  toolPages,
  allGuidePages,
  allAreaPages,
  homeMatchToolPage,
  sellerStrategyToolPage,
  equityMoveUpToolPage,
  wealthForecastToolPage,
};
