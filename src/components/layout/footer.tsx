"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TenantLogo } from "@/components/branding/tenant-logo";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";
import {
  getTenantSlugFromPath,
  tenantPathFromPathname,
} from "@/lib/tenants/tenant-paths";

const footerToolLinks = [
  { href: "/tools", label: "All Tools" },
  { href: "/tools/home-match", label: "Buyer Brief" },
  { href: "/tools/seller-strategy", label: "Seller Strategy" },
  { href: "/tools/equity-move-up", label: "Equity Move Up" },
  { href: "/tools/wealth-forecast", label: "Wealth Forecast" },
];

const footerGuideLinks = [
  {
    href: "/guides/sell-first-or-buy-first-orange-county",
    label: "Sell First or Buy First",
  },
  {
    href: "/guides/orange-county-equity-move-up",
    label: "Orange County Equity Move-Up",
  },
  {
    href: "/guides/luxury-home-monthly-carry",
    label: "Luxury Home Monthly Carry",
  },
  {
    href: "/guides/private-market-testing-before-selling",
    label: "Private Market Testing",
  },
];

const footerAreaLinks = [
  { href: "/areas/irvine", label: "Irvine" },
  { href: "/areas/costa-mesa", label: "Costa Mesa" },
  { href: "/areas/newport-beach", label: "Newport Beach" },
  { href: "/areas/laguna-beach", label: "Laguna Beach" },
];

export function Footer() {
  const pathname = usePathname();
  const tenant = useCurrentTenant();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const tenantToolLinks = [
    { href: tenantPathFromPathname(pathname, "/buyer"), label: "Private Client Brief" },
    { href: tenantPathFromPathname(pathname, "/seller"), label: "Seller Strategy" },
    { href: tenantPathFromPathname(pathname, "/equity"), label: "Equity Move Up" },
    {
      href: tenantPathFromPathname(pathname, "/wealth-forecast"),
      label: "Wealth Forecast",
    },
  ];
  const activeToolLinks = tenantSlug ? tenantToolLinks : footerToolLinks;
  return (
    <footer className="border-t border-gray-100 bg-beige/30 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 grid gap-8 text-left sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="mb-3 text-xs font-medium tracking-[0.16em] text-navy uppercase">
              Decision Tools
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {activeToolLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium tracking-[0.16em] text-navy uppercase">
              Planning Guides
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {footerGuideLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-medium tracking-[0.16em] text-navy uppercase">
              Area Guides
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              {footerAreaLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-navy">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-start sm:items-end">
            <TenantLogo
              tenant={tenant}
              width={120}
              height={80}
              className="mb-4 opacity-80"
            />
          </div>
        </div>
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-gray-500">
            {tenant.disclaimerText}
          </p>
          <p className="mt-4 text-xs text-gray-400">
            © {new Date().getFullYear()} {tenant.brandName}.{" "}
            {tenant.supportedStates.join(", ")} only.
          </p>
        </div>
      </div>
    </footer>
  );
}
