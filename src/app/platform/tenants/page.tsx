"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import { Button } from "@/components/ui/button";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";

interface PlatformTenantRow {
  id: string;
  slug: string;
  brand_name: string;
  agent_name: string;
  notification_email: string | null;
  lead_count: number;
  activity_count: number;
  created_at: string;
}

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function PlatformTenantsListView() {
  const [tenants, setTenants] = useState<PlatformTenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch("/api/platform/tenants");
      const data = (await res.json()) as
        | { tenants?: PlatformTenantRow[]; error?: string }
        | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to load tenants");
        return;
      }
      setTenants(data?.tenants ?? []);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial platform tenants load
    void fetchTenants();
  }, [fetchTenants]);

  const handleCopyUrl = async (slug: string) => {
    const url = `${PUBLIC_BASE_URL}/a/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage(`Copied ${url}`);
      window.setTimeout(() => setCopyMessage(null), 1600);
    } catch {
      setCopyMessage("Clipboard unavailable");
    }
  };

  return (
    <PlatformPageShell
      title="Platform Tenants"
      subtitle="Create and manage agent tenants across the platform."
      actions={
        <>
          <Button variant="secondary" onClick={() => void fetchTenants()} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
          <Link href="/platform/tenants/new">
            <Button>Create Tenant</Button>
          </Link>
        </>
      }
    >
      {copyMessage ? <p className="mb-4 text-sm text-green-700">{copyMessage}</p> : null}
      {error ? (
        <div className="rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-100 bg-beige/30 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Brand</th>
                <th className="px-4 py-3 font-medium">Agent</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Tenant URL</th>
                <th className="px-4 py-3 font-medium">Notification Email</th>
                <th className="px-4 py-3 font-medium">Lead Count</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => {
                const tenantUrl = `${PUBLIC_BASE_URL}/a/${tenant.slug}`;
                return (
                  <tr key={tenant.id} className="border-b border-gray-50">
                    <td className="px-4 py-3">{tenant.brand_name}</td>
                    <td className="px-4 py-3">{tenant.agent_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{tenant.slug}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <a
                          href={tenantUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-navy underline decoration-dotted underline-offset-4"
                        >
                          Open
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleCopyUrl(tenant.slug)}
                        >
                          Copy
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3">{tenant.notification_email ?? "—"}</td>
                    <td className="px-4 py-3">{tenant.lead_count}</td>
                    <td className="px-4 py-3">{formatDate(tenant.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/tenants/${tenant.slug}`}
                        className="text-navy underline decoration-dotted underline-offset-4"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {!loading && tenants.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-gray-500" colSpan={8}>
                    No tenants found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </PlatformPageShell>
  );
}

export default function PlatformTenantsPage() {
  return (
    <PlatformAuthGate
      title="Platform Admin"
      description="Restricted access for platform-level tenant management."
    >
      <PlatformTenantsListView />
    </PlatformAuthGate>
  );
}
