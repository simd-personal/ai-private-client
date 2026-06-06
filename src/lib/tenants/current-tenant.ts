"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getTenantBySlug, type TenantConfig } from "@/lib/tenants/tenant-config";
import { getTenantSlugFromPath } from "@/lib/tenants/tenant-paths";

export function useCurrentTenant() {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const fallback = getTenantBySlug(tenantSlug);
  const [resolvedTenant, setResolvedTenant] = useState<TenantConfig | null>(null);

  useEffect(() => {
    let active = true;

    const endpoint = tenantSlug
      ? `/api/tenant?tenant=${encodeURIComponent(tenantSlug)}`
      : "/api/tenant";

    void fetch(endpoint)
      .then(async (response) => {
        if (!response.ok) return null;
        const json = (await response.json()) as {
          tenant?: Partial<TenantConfig>;
        };
        if (!json.tenant) return null;
        return { ...fallback, ...json.tenant };
      })
      .then((nextTenant) => {
        if (active && nextTenant) {
          setResolvedTenant(nextTenant);
        }
      })
      .catch(() => {
        /* fall back silently */
      });

    return () => {
      active = false;
    };
  }, [tenantSlug, fallback]);

  if (resolvedTenant?.slug === fallback.slug) {
    return resolvedTenant;
  }
  return fallback;
}
