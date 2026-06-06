import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { areaSubPages } from "@/lib/seo/content/areas";

const content = areaSubPages["costa-mesa/seller-strategy"];

export const metadata = buildSeoMetadata(content);

export default function Page() {
  return <SeoContentPage content={content} />;
}
