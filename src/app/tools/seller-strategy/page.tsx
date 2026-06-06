import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { sellerStrategyToolPage } from "@/lib/seo/routes";

export const metadata = buildSeoMetadata(sellerStrategyToolPage);

export default function SellerStrategyToolSeoPage() {
  return <SeoContentPage content={sellerStrategyToolPage} />;
}
