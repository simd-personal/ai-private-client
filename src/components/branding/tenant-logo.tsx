"use client";

import Image from "next/image";
import type { TenantConfig } from "@/lib/tenants/tenant-config";

interface TenantLogoProps {
  tenant: TenantConfig;
  width: number;
  height: number;
  className?: string;
  alt?: string;
}

function getTenantLogoSrc(tenant: TenantConfig): string | null {
  const raw = tenant.logoUrl?.trim();
  return raw || null;
}

function getInitials(brandName: string): string {
  const words = brandName
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "");
  return initials.join("") || "BR";
}

export function TenantLogo({
  tenant,
  width,
  height,
  className,
  alt,
}: TenantLogoProps) {
  const src = getTenantLogoSrc(tenant);
  const resolvedAlt = alt ?? `${tenant.brandName} logo`;

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center rounded bg-navy/10 text-navy ${className ?? ""}`}
        style={{ width, height }}
        aria-label={resolvedAlt}
      >
        <span className="text-sm font-semibold tracking-wide">
          {getInitials(tenant.brandName)}
        </span>
      </div>
    );
  }

  if (src.startsWith("/")) {
    return (
      <Image
        src={src}
        alt={resolvedAlt}
        width={width}
        height={height}
        className={className}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element -- external tenant logo URL may be unknown at build time
  return <img src={src} alt={resolvedAlt} width={width} height={height} className={className} />;
}
