"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutAdminSession } from "@/lib/admin/admin-session";
import {
  buildTenantPath,
  getTenantSlugFromPath,
} from "@/lib/tenants/tenant-paths";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/admin", label: "Leads", match: (path: string) => path === "/admin" },
  {
    href: "/admin/activity",
    label: "Website Activity",
    match: (path: string) => path.startsWith("/admin/activity"),
  },
  {
    href: "/admin/seo-checklist",
    label: "SEO Checklist",
    match: (path: string) => path.startsWith("/admin/seo-checklist"),
  },
  {
    href: "/admin/settings",
    label: "Settings",
    match: (path: string) => path.startsWith("/admin/settings"),
  },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const normalizedPath = tenantSlug
    ? pathname.replace(`/a/${tenantSlug}`, "") || "/"
    : pathname;

  const handleLogout = () => {
    logoutAdminSession();
    window.location.assign(buildTenantPath("/admin", tenantSlug));
  };

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.match(normalizedPath);

          return (
            <Link
              key={tab.href}
              href={buildTenantPath(tab.href, tenantSlug)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-navy text-white shadow-sm"
                  : "text-gray-600 hover:bg-beige/50 hover:text-navy"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
      <Button variant="ghost" size="sm" onClick={handleLogout}>
        Log Out
      </Button>
    </nav>
  );
}
