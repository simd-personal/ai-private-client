"use client";

import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SeoCta } from "@/lib/seo/types";
import { TrackedSeoLink } from "@/components/seo/tracked-seo-link";

export function SeoCtaCard({ cta }: { cta: SeoCta }) {
  return (
    <section className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl bg-navy px-8 py-10 text-white shadow-xl md:px-10">
          <h2 className="mb-3 font-serif text-2xl md:text-3xl">
            Ready for your private planning scenario?
          </h2>
          {cta.supportingText ? (
            <p className="mb-6 max-w-2xl text-sm leading-relaxed text-gray-300 md:text-base">
              {cta.supportingText}
            </p>
          ) : null}
          <TrackedSeoLink href={cta.href} ctaLabel={cta.label}>
            <Button size="lg" variant="champagne" className="gap-2">
              {cta.label}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </TrackedSeoLink>
        </div>
      </div>
    </section>
  );
}
