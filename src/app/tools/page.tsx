import { buildSeoMetadata } from "@/lib/seo/metadata";
import { toolsIndexPage } from "@/lib/seo/routes";
import { SeoToolsIndexPage } from "@/components/seo/seo-tools-index-page";

export const metadata = buildSeoMetadata(toolsIndexPage);

export default function ToolsIndexPage() {
  return <SeoToolsIndexPage content={toolsIndexPage} />;
}
