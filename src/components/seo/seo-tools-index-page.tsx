import Link from "next/link";
import { SeoPageShell } from "@/components/seo/seo-page-shell";
import { SeoHero } from "@/components/seo/seo-hero";
import { SeoSection } from "@/components/seo/seo-section";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ToolCard, RelatedLinksSection } from "@/components/seo/seo-cards";
import {
  StructuredData,
  buildBreadcrumbSchema,
} from "@/components/seo/structured-data";
import type { ToolsIndexContent } from "@/lib/seo/types";
import {
  ORGANIZATION_SCHEMA,
  buildLocalBusinessSchema,
} from "@/lib/seo/site-config";

export function SeoToolsIndexPage({ content }: { content: ToolsIndexContent }) {
  return (
    <SeoPageShell>
      <StructuredData
        data={[
          ORGANIZATION_SCHEMA,
          buildLocalBusinessSchema(),
          buildBreadcrumbSchema(content.breadcrumbs),
        ]}
      />
      <div className="px-6 pt-8">
        <div className="mx-auto max-w-5xl">
          <Breadcrumbs items={content.breadcrumbs} />
        </div>
      </div>
      <SeoHero
        eyebrow="Private Client Property Desk"
        title={content.h1}
        intro={content.intro}
      />
      <SeoSection title="Choose your planning tool">
        <div className="grid gap-6 md:grid-cols-2">
          {content.tools.map((tool) => (
            <div key={tool.title} className="space-y-3">
              <ToolCard
                title={tool.title}
                description={tool.description}
                href={tool.href}
                cta={tool.cta}
                trackAs="tool_card"
              />
              <Link
                href={tool.seoHref}
                className="inline-block text-sm text-gray-500 transition hover:text-navy"
              >
                Read the {tool.title} overview →
              </Link>
            </div>
          ))}
        </div>
      </SeoSection>
      {content.relatedLinks ? (
        <RelatedLinksSection links={content.relatedLinks} />
      ) : null}
    </SeoPageShell>
  );
}
