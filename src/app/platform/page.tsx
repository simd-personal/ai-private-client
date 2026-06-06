"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";

interface SummaryTenant {
  slug: string;
  brand_name: string;
  agent_name: string;
  created_at: string;
  lead_count: number;
}

interface PlatformSummaryResponse {
  totalTenants: number;
  totalLeads: number;
  totalActivityEvents: number;
  latestTenantCreated: string | null;
  latestLeadCreated: string | null;
  topTenantsByLeadCount: Array<{
    slug: string;
    brand_name: string;
    agent_name: string;
    lead_count: number;
  }>;
  recentTenants: SummaryTenant[];
}

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function PlatformHomeContent() {
  const [summary, setSummary] = useState<PlatformSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch("/api/platform/summary");
      const data = (await res.json()) as
        | PlatformSummaryResponse
        | { error?: string };
      if (!res.ok || !("recentTenants" in data)) {
        setError((data as { error?: string }).error ?? "Failed to load dashboard");
        return;
      }
      setSummary(data);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial platform dashboard load
    void fetchSummary();
  }, [fetchSummary]);

  const hasDemoTenant = useMemo(
    () =>
      Boolean(
        summary?.recentTenants.some((tenant) => tenant.slug === "demo-agent") ||
          summary?.topTenantsByLeadCount.some((tenant) => tenant.slug === "demo-agent")
      ),
    [summary?.recentTenants, summary?.topTenantsByLeadCount]
  );

  const recentTenants = summary?.recentTenants ?? [];

  return (
    <PlatformPageShell
      title="Platform Admin"
      subtitle="SaaS-level overview across all tenant activity."
      actions={
        <Button variant="secondary" onClick={() => void fetchSummary()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total tenants" value={String(summary?.totalTenants ?? 0)} />
        <SummaryCard label="Total leads" value={String(summary?.totalLeads ?? 0)} />
        <SummaryCard
          label="Total website events"
          value={String(summary?.totalActivityEvents ?? 0)}
        />
        <SummaryCard
          label="Latest lead"
          value={formatDate(summary?.latestLeadCreated ?? null)}
        />
      </section>

      <section className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm font-medium text-navy">Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/platform/tenants/new">
            <Button>Create tenant</Button>
          </Link>
          <Link href="/platform/tenants">
            <Button variant="secondary">View tenants</Button>
          </Link>
          <a href={`${PUBLIC_BASE_URL}/a/private-client/admin`} target="_blank" rel="noreferrer">
            <Button variant="secondary">Open Private Client admin</Button>
          </a>
          {hasDemoTenant ? (
            <a
              href={`${PUBLIC_BASE_URL}/a/demo-agent/admin`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="secondary">Open demo-agent admin</Button>
            </a>
          ) : null}
        </div>
      </section>

      {summary && summary.totalTenants === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-gray-500">
            No tenants yet. Create your first agent tenant.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-4">
            <p className="text-sm font-medium text-navy">Recent tenants</p>
            <p className="text-xs text-gray-500">
              Latest tenant provisioning activity and lead counts.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-beige/30 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Brand</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Lead Count</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Tenant URL</th>
                  <th className="px-4 py-3 font-medium">Admin URL</th>
                </tr>
              </thead>
              <tbody>
                {recentTenants.map((tenant) => (
                  <tr key={tenant.slug} className="border-t border-gray-50">
                    <td className="px-4 py-3">{tenant.brand_name}</td>
                    <td className="px-4 py-3">{tenant.agent_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
                    <td className="px-4 py-3">{tenant.lead_count}</td>
                    <td className="px-4 py-3">{formatDate(tenant.created_at)}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`${PUBLIC_BASE_URL}/a/${tenant.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-navy underline decoration-dotted underline-offset-4"
                      >
                        Open
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`${PUBLIC_BASE_URL}/a/${tenant.slug}/admin`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-navy underline decoration-dotted underline-offset-4"
                      >
                        Open
                      </a>
                    </td>
                  </tr>
                ))}
                {!loading && recentTenants.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                      No tenant records yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PlatformPageShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-xs tracking-[0.16em] text-gray-500 uppercase">{label}</p>
      <p className="mt-2 font-serif text-3xl text-navy">{value}</p>
    </div>
  );
}

export default function PlatformHomePage() {
  return (
    <PlatformAuthGate
      title="Platform Admin"
      description="Restricted access for platform-level tenant management."
    >
      <PlatformHomeContent />
    </PlatformAuthGate>
  );
}
