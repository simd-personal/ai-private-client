"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import {
  TrackedSeoLink,
  TrackedToolCardLink,
} from "@/components/seo/tracked-seo-link";
import type { SeoLink } from "@/lib/seo/types";

export function ToolCard({
  title,
  description,
  href,
  cta,
  trackAs = "seo_cta",
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  trackAs?: "tool_card" | "seo_cta";
}) {
  const LinkComponent = trackAs === "tool_card" ? TrackedToolCardLink : TrackedSeoLink;

  return (
    <Card className="h-full transition-shadow hover:shadow-lg">
      <CardContent className="flex h-full flex-col p-6 md:p-8">
        <CardTitle className="mb-2 text-xl">{title}</CardTitle>
        <CardDescription className="mb-6 flex-1 text-base leading-relaxed">
          {description}
        </CardDescription>
        <LinkComponent
          href={href}
          ctaLabel={cta}
          className="inline-flex items-center gap-2 text-sm font-medium text-navy transition hover:text-navy-light"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </LinkComponent>
      </CardContent>
    </Card>
  );
}

export function GuideCard({ link }: { link: SeoLink }) {
  return (
    <Link href={link.href} className="block h-full">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="p-5">
          <p className="font-medium text-navy">{link.label}</p>
          {link.description ? (
            <p className="mt-2 text-sm text-gray-500">{link.description}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function AreaCard({ link }: { link: SeoLink }) {
  return <GuideCard link={link} />;
}

export function RelatedLinksSection({ links }: { links: SeoLink[] }) {
  if (links.length === 0) return null;

  return (
    <section className="bg-beige/20 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-6 font-serif text-2xl text-navy">Related planning pages</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {links.map((link) => (
            <GuideCard key={link.href} link={link} />
          ))}
        </div>
      </div>
    </section>
  );
}
