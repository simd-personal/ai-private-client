import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { homeMatchToolPage } from "@/lib/seo/routes";

export const metadata = buildSeoMetadata(homeMatchToolPage);

export default function HomeMatchToolSeoPage() {
  return <SeoContentPage content={homeMatchToolPage} />;
}
