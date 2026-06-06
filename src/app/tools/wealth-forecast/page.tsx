import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { wealthForecastToolPage } from "@/lib/seo/routes";

export const metadata = buildSeoMetadata(wealthForecastToolPage);

export default function WealthForecastToolSeoPage() {
  return <SeoContentPage content={wealthForecastToolPage} />;
}
