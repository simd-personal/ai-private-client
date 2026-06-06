import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { areaPages } from "@/lib/seo/content/areas";

const content = areaPages["laguna-beach"];

export const metadata = buildSeoMetadata(content);

export default function Page() {
  return <SeoContentPage content={content} />;
}
