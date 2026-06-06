"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantLogo } from "@/components/branding/tenant-logo";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import { tenantPathFromPathname } from "@/lib/tenants/tenant-paths";

export function Header() {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 px-6 py-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <Link href={tenantPathFromPathname(pathname, "/")} className="flex items-center gap-3">
          <TenantLogo tenant={tenant} width={48} height={32} className="rounded" />
          <div className="hidden sm:block">
            <p className="text-xs tracking-[0.2em] text-champagne uppercase">
              {tenant.brandName}
            </p>
            <p className="text-[10px] text-gray-400">{tenant.agentName}</p>
          </div>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href={tenantPathFromPathname(pathname, "/buyer")}
            className="text-gray-300 transition hover:text-white"
          >
            Buy
          </Link>
          <Link
            href={tenantPathFromPathname(pathname, "/seller")}
            className="text-gray-300 transition hover:text-white"
          >
            Sell
          </Link>
        </nav>
      </div>
    </header>
  );
}
