import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { equityMoveUpToolPage } from "@/lib/seo/routes";

export const metadata = buildSeoMetadata(equityMoveUpToolPage);

export default function EquityMoveUpToolSeoPage() {
  return <SeoContentPage content={equityMoveUpToolPage} />;
}
