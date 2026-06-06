import { SeoPageShell } from "@/components/seo/seo-page-shell";
import { SeoHero } from "@/components/seo/seo-hero";
import { SeoSection } from "@/components/seo/seo-section";
import { SeoFaq } from "@/components/seo/seo-faq";
import { SeoCtaCard } from "@/components/seo/seo-cta-card";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { RelatedLinksSection } from "@/components/seo/seo-cards";
import {
  StructuredData,
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
} from "@/components/seo/structured-data";
import type { SeoPageContent } from "@/lib/seo/types";
import {
  ORGANIZATION_SCHEMA,
  buildLocalBusinessSchema,
} from "@/lib/seo/site-config";

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-gray-600">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ConsiderationCards({
  items,
}: {
  items: SeoPageContent["considerations"];
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.title}
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <h3 className="mb-2 font-medium text-navy">{item.title}</h3>
          <p className="text-sm leading-relaxed text-gray-600">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export function SeoContentPage({ content }: { content: SeoPageContent }) {
  const eyebrow =
    content.kind === "tool"
      ? "Decision Tool"
      : content.kind === "guide"
        ? "Planning Guide"
        : "Area Guide";

  const schema = [
    ORGANIZATION_SCHEMA,
    buildLocalBusinessSchema(),
    buildBreadcrumbSchema(content.breadcrumbs),
    ...(content.faqs.length > 0 ? [buildFaqSchema(content.faqs)] : []),
    ...(content.useArticleSchema
      ? [
          buildArticleSchema({
            path: content.path,
            title: content.title,
            description: content.description,
            h1: content.h1,
          }),
        ]
      : []),
  ];

  return (
    <SeoPageShell>
      <StructuredData data={schema} />
      <div className="px-6 pt-8">
        <div className="mx-auto max-w-3xl">
          <Breadcrumbs items={content.breadcrumbs} />
        </div>
      </div>
      <SeoHero eyebrow={eyebrow} title={content.h1} intro={content.intro} />
      <SeoSection title="Who this is for">
        <BulletList items={content.whoThisIsFor} />
      </SeoSection>
      <SeoSection title="Key planning considerations" className="bg-beige/20">
        <ConsiderationCards items={content.considerations} />
      </SeoSection>
      <SeoSection title="Common tradeoffs">
        <ConsiderationCards items={content.tradeoffs} />
      </SeoSection>
      {content.faqs.length > 0 ? (
        <SeoSection title="Frequently asked questions" className="bg-beige/20">
          <SeoFaq faqs={content.faqs} />
        </SeoSection>
      ) : null}
      <SeoCtaCard cta={content.cta} />
      {content.relatedLinks ? (
        <RelatedLinksSection links={content.relatedLinks} />
      ) : null}
    </SeoPageShell>
  );
}
