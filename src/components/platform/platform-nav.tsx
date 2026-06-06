"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logoutPlatformAdminSession } from "@/lib/platform-admin/session";
import { cn } from "@/lib/utils";

const tabs = [
  {
    href: "/platform",
    label: "Dashboard",
    match: (path: string) => path === "/platform",
  },
  {
    href: "/platform/demo",
    label: "Demo",
    match: (path: string) => path.startsWith("/platform/demo"),
  },
  {
    href: "/platform/tenants",
    label: "Tenants",
    match: (path: string) => path.startsWith("/platform/tenants"),
  },
  {
    href: "/platform/tenants/new",
    label: "Create Tenant",
    match: (path: string) => path.startsWith("/platform/tenants/new"),
  },
] as const;

export function PlatformNav() {
  const pathname = usePathname();

  const handleLogout = () => {
    logoutPlatformAdminSession();
    window.location.assign("/platform");
  };

  return (
    <nav className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
