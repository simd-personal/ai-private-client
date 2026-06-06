import type { SeoBreadcrumb, SeoFaqItem } from "@/lib/seo/types";
import { getSiteUrl } from "@/lib/seo/site-config";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function StructuredData({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}

export function buildBreadcrumbSchema(breadcrumbs: SeoBreadcrumb[]) {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: `${siteUrl}${crumb.href}` } : {}),
    })),
  };
}

export function buildFaqSchema(faqs: SeoFaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function buildArticleSchema(page: {
  path: string;
  title: string;
  description: string;
  h1: string;
}) {
  const siteUrl = getSiteUrl();

  const tenant = getDefaultTenant();

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.h1,
    name: page.title,
    description: page.description,
    url: `${siteUrl}${page.path}`,
    author: {
      "@type": "Organization",
      name: tenant.brandName,
    },
    publisher: {
      "@type": "Organization",
      name: tenant.brandName,
      url: siteUrl,
    },
  };
}
