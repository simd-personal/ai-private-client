import { SeoContentPage } from "@/components/seo/seo-content-page";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { guidePages } from "@/lib/seo/content/guides";

const content = guidePages["luxury-home-monthly-carry"];

export const metadata = buildSeoMetadata(content);

export default function Page() {
  return <SeoContentPage content={content} />;
}
