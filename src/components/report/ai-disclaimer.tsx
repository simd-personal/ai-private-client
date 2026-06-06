"use client";

import { useCurrentTenant } from "@/lib/tenants/current-tenant";

export function AiDisclaimer() {
  const tenant = useCurrentTenant();
  return (
    <div
      className="rounded-xl border border-champagne/30 bg-champagne/10 px-5 py-4 text-sm text-navy/80 leading-relaxed"
      data-testid="public-disclaimer"
    >
      {tenant.disclaimerText}
    </div>
  );
}
