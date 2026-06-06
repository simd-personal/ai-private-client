"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PlatformAuthGate } from "@/components/platform/platform-auth-gate";
import { PlatformPageShell } from "@/components/platform/platform-page-shell";
import {
  PlatformTenantForm,
  type PlatformTenantRecord,
  type PlatformTenantSubmitPayload,
} from "@/components/platform/platform-tenant-form";
import { PlatformTenantDomains } from "@/components/platform/platform-tenant-domains";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";

interface PlatformTenantDetailResponse {
  tenant: PlatformTenantRecord;
  lead_count: number;
  activity_count: number;
  last_lead_date: string | null;
}

const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function PlatformTenantDetailView() {
  const params = useParams<{ tenantSlug: string }>();
  const tenantSlug = params?.tenantSlug;
  const [tenant, setTenant] = useState<PlatformTenantRecord | null>(null);
  const [leadCount, setLeadCount] = useState(0);
  const [activityCount, setActivityCount] = useState(0);
  const [lastLeadDate, setLastLeadDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTenant = useCallback(async () => {
    if (!tenantSlug) return;
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch(`/api/platform/tenants/${tenantSlug}`);
      const data = (await res.json()) as
        | PlatformTenantDetailResponse
        | { error?: string };

      if (!res.ok || !("tenant" in data)) {
        setError((data as { error?: string }).error ?? "Failed to load tenant");
        return;
      }

      setTenant(data.tenant);
      setLeadCount(data.lead_count);
      setActivityCount(data.activity_count);
      setLastLeadDate(data.last_lead_date);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial tenant detail load
    void fetchTenant();
  }, [fetchTenant]);

  const handleUpdateTenant = async (payload: PlatformTenantSubmitPayload) => {
    if (!tenantSlug) return { ok: false, error: "Invalid tenant slug" };
    try {
      const res = await platformAdminFetch(`/api/platform/tenants/${tenantSlug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as
        | PlatformTenantDetailResponse
        | { error?: string; details?: { fieldErrors?: Record<string, string[]> } };

      if (!res.ok || !("tenant" in data)) {
        const validationErrors =
          "details" in data && data.details?.fieldErrors
            ? Object.entries(data.details.fieldErrors)
                .flatMap(([field, messages]) =>
                  messages?.length
                    ? [`${field.replace(/_/g, " ")}: ${messages.join(", ")}`]
                    : []
                )
                .join(" ")
            : null;
        return {
          ok: false,
          error: validationErrors || (data as { error?: string }).error || "Failed to update tenant",
        };
      }

      setTenant(data.tenant);
      setLeadCount(data.lead_count);
      setActivityCount(data.activity_count);
      setLastLeadDate(data.last_lead_date);
      return { ok: true };
    } catch {
      return { ok: false, error: "Failed to connect" };
    }
  };

  const tenantUrl = tenant ? `${PUBLIC_BASE_URL}/a/${tenant.slug}` : "—";
  const tenantAdminUrl = tenant ? `${PUBLIC_BASE_URL}/a/${tenant.slug}/admin` : "—";
  return (
    <PlatformPageShell
      title={tenant ? `Manage ${tenant.brand_name}` : "Manage Tenant"}
      subtitle="Platform-level tenant controls"
    >
      {error ? (
        <div className="mb-6 rounded-2xl border border-red-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <p className="mb-4 text-sm font-medium text-navy">Tenant endpoints & stats</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-400">Public tenant URL</dt>
            <dd>
              {tenant ? (
                <a
                  href={tenantUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy underline decoration-dotted underline-offset-4"
                >
                  {tenantUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Tenant admin URL</dt>
            <dd>
              {tenant ? (
                <a
                  href={tenantAdminUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-navy underline decoration-dotted underline-offset-4"
                >
                  {tenantAdminUrl}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-gray-400">Lead count</dt>
            <dd>{leadCount}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Activity count</dt>
            <dd>{activityCount}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Last lead date</dt>
            <dd>{formatDateTime(lastLeadDate)}</dd>
          </div>
          <div>
            <dt className="text-gray-400">Logo upload</dt>
            <dd>
              {tenant ? (
                <Link
                  href={`/a/${tenant.slug}/admin/settings`}
                  className="text-navy underline decoration-dotted underline-offset-4"
                >
                  Manage logo in tenant admin settings
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </div>

      {tenant ? <PlatformTenantDomains tenantSlug={tenant.slug} /> : null}

      {loading && !tenant ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">Loading tenant...</p>
        </div>
      ) : tenant ? (
        <PlatformTenantForm
          mode="edit"
          initialTenant={tenant}
          onSubmit={handleUpdateTenant}
          submitLabel="Save tenant"
        />
      ) : null}
    </PlatformPageShell>
  );
}

export default function PlatformTenantDetailPage() {
  return (
    <PlatformAuthGate
      title="Platform Admin"
      description="Restricted access for platform-level tenant management."
    >
      <PlatformTenantDetailView />
    </PlatformAuthGate>
  );
}
