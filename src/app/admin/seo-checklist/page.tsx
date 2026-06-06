"use client";

import { ExternalLink } from "lucide-react";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  getLaunchChecklistUrls,
  getStructuredDataTestUrl,
  INDEXABLE_PUBLIC_PATHS,
  KEY_SEO_ROUTES,
  NON_INDEXABLE_PATHS,
  SEARCH_CONSOLE_SETUP_STEPS,
} from "@/lib/seo/launch-checklist";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function AdminSeoChecklistPageView() {
  const tenant = getDefaultTenant();
  const { siteUrl, sitemapUrl, robotsUrl } = getLaunchChecklistUrls();
  const googleVerificationConfigured = Boolean(
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
  );

  return (
    <AdminAuthGate
      title="SEO Launch Checklist"
      description={`Internal QA for ${tenant.brandName} organic launch`}
    >
      <AdminPageShell
          title="SEO Launch Checklist"
          subtitle="Validate sitemap, robots, indexing rules, and Search Console setup before launch."
          wide
        >
          <div className="space-y-8">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl text-navy">Core crawl files</h2>
              <ul className="space-y-3 text-sm">
                <ChecklistLink label="Sitemap URL" href={sitemapUrl} />
                <ChecklistLink label="Robots URL" href={robotsUrl} />
                <li className="text-gray-600">
                  Production site:{" "}
                  <a
                    href={siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-navy underline-offset-2 hover:underline"
                  >
                    {siteUrl}
                  </a>
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl text-navy">Google Search Console</h2>
              <p className="mb-4 text-sm text-gray-600">
                Verification env:{" "}
                <span className="font-medium text-navy">
                  {googleVerificationConfigured ? "Configured" : "Not configured"}
                </span>
              </p>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-gray-600">
                {SEARCH_CONSOLE_SETUP_STEPS.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl text-navy">Key SEO routes</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {KEY_SEO_ROUTES.map((path) => (
                  <li key={path}>
                    <a
                      href={`${siteUrl}${path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-navy underline-offset-2 hover:underline"
                    >
                      {path}
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-serif text-xl text-navy">
                Structured data validation
              </h2>
              <ul className="space-y-2">
                {KEY_SEO_ROUTES.slice(0, 4).map((path) => (
                  <li key={path}>
                    <a
                      href={getStructuredDataTestUrl(path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-navy underline-offset-2 hover:underline"
                    >
                      Rich Results Test: {path}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <div className="grid gap-6 md:grid-cols-2">
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-serif text-xl text-navy">Should be indexed</h2>
                <ul className="max-h-72 space-y-1 overflow-y-auto text-sm text-gray-600">
                  {INDEXABLE_PUBLIC_PATHS.map((path) => (
                    <li key={path} className="font-mono text-xs">
                      {path}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-serif text-xl text-navy">Should not be indexed</h2>
                <ul className="space-y-1 text-sm text-gray-600">
                  {NON_INDEXABLE_PATHS.map((path) => (
                    <li key={path} className="font-mono text-xs">
                      {path}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  Also blocked via robots.txt: /admin, /api/, /result, /thank-you
                </p>
              </section>
            </div>
          </div>
        </AdminPageShell>
    </AdminAuthGate>
  );
}

export default function AdminSeoChecklistPage() {
  return <AdminSeoChecklistPageView />;
}

function ChecklistLink({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <span className="text-gray-500">{label}: </span>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium text-navy underline-offset-2 hover:underline"
      >
        {href}
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </li>
  );
}
