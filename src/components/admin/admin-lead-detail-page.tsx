"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdminLeadTable,
  type AdminLead,
} from "@/components/admin/admin-lead-table";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { LeadSessionJourney } from "@/lib/analytics/server";
import { buildTenantPath } from "@/lib/tenants/tenant-paths";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenants/tenant-config";

interface AdminLeadDetailContentProps {
  leadId: string;
  tenantSlug?: string;
}

function AdminLeadDetailContent({
  leadId,
  tenantSlug,
}: AdminLeadDetailContentProps) {
  const router = useRouter();
  const [lead, setLead] = useState<AdminLead | null>(null);
  const [leadJourney, setLeadJourney] = useState<LeadSessionJourney | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminPath = tenantSlug
    ? buildTenantPath("/admin", tenantSlug)
    : "/admin";
  const presentationPath = tenantSlug
    ? `/a/${tenantSlug}/admin/leads/${leadId}/present`
    : `/admin/leads/${leadId}/present`;

  const fetchLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/leads");
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load lead");
        return;
      }

      const data = (await res.json()) as { leads?: AdminLead[] };
      const match = data.leads?.find((row) => row.id === leadId) ?? null;
      if (!match) {
        setError("Lead not found for this tenant.");
        return;
      }
      setLead(match);

      const analyticsRes = await adminFetch(
        `/api/admin/analytics?leadIds=${encodeURIComponent(leadId)}`
      );
      if (analyticsRes.ok) {
        const analyticsData = (await analyticsRes.json()) as {
          leadJourneys?: Record<string, LeadSessionJourney>;
        };
        setLeadJourney(analyticsData.leadJourneys?.[leadId] ?? null);
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load lead on mount
    void fetchLead();
  }, [fetchLead]);

  if (loading) {
    return (
      <AdminPageShell title="Lead Detail" subtitle="Loading…">
        <div className="animate-pulse space-y-3 rounded-xl border border-gray-100 bg-white p-6">
          <div className="h-6 w-1/3 rounded bg-gray-100" />
          <div className="h-24 rounded bg-gray-50" />
        </div>
      </AdminPageShell>
    );
  }

  if (error || !lead) {
    return (
      <AdminPageShell title="Lead Detail" subtitle="Unable to open this lead">
        <p className="mb-4 text-sm text-red-600">
          {error ?? "Lead not found"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={adminPath}>
            <Button variant="secondary">Back to admin</Button>
          </Link>
          <Button variant="secondary" onClick={() => router.refresh()}>
            Retry
          </Button>
        </div>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      wide
      title={`${lead.first_name} ${lead.last_name}`}
      subtitle={`${lead.lead_type} · ${lead.lead_temperature} · score ${lead.lead_score}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href={adminPath}>
            <Button variant="secondary">All leads</Button>
          </Link>
          <Link href={presentationPath}>
            <Button variant="secondary">Presentation</Button>
          </Link>
          <Button variant="secondary" onClick={() => void fetchLead()}>
            Refresh
          </Button>
        </div>
      }
    >
      <div data-testid="admin-lead-page">
        <AdminLeadTable
          leads={[lead]}
          leadJourneys={leadJourney ? { [lead.id]: leadJourney } : {}}
          onRefresh={() => void fetchLead()}
          tenantSlug={tenantSlug}
        />
      </div>
    </AdminPageShell>
  );
}

interface AdminLeadDetailPageProps {
  leadId: string;
  tenantSlug?: string;
}

export function AdminLeadDetailPage({
  leadId,
  tenantSlug,
}: AdminLeadDetailPageProps) {
  const tenant = tenantSlug
    ? getTenantBySlug(tenantSlug)
    : getDefaultTenant();

  return (
    <AdminAuthGate
      title="Lead Detail"
      description={`Internal access for ${tenant.brandName}`}
    >
      <AdminLeadDetailContent leadId={leadId} tenantSlug={tenantSlug} />
    </AdminAuthGate>
  );
}
