"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminLeadFilters,
  type AdminFiltersState,
} from "@/components/admin/admin-lead-filters";
import {
  AdminLeadTable,
  type AdminLead,
} from "@/components/admin/admin-lead-table";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminPipelineSummary } from "@/components/admin/admin-pipeline-summary";
import { AdminSeoAttributionTable } from "@/components/admin/admin-seo-attribution-table";
import { AdminAuthGate } from "@/components/admin/admin-auth-gate";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { LeadSessionJourney } from "@/lib/analytics/server";
import { exportLeadsToCsv } from "@/lib/admin/export-csv";
import { filterAndSortLeads } from "@/lib/admin/filter-leads";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

const defaultFilters: AdminFiltersState = {
  search: "",
  leadType: "all",
  temperature: "all",
  status: "all",
  pipelineStatus: "all",
  sort: "newest",
};

function AdminLeadsDashboard() {
  const tenant = getDefaultTenant();
  const [tenantBrandName, setTenantBrandName] = useState(tenant.brandName);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [leadJourneys, setLeadJourneys] = useState<
    Record<string, LeadSessionJourney>
  >({});
  const [filters, setFilters] = useState<AdminFiltersState>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredLeads = useMemo(
    () => filterAndSortLeads(leads, filters),
    [leads, filters]
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const leadsRes = await adminFetch("/api/admin/leads");

      if (leadsRes.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }

      if (!leadsRes.ok) {
        setError("Failed to load leads");
        return;
      }

      const leadsData = await leadsRes.json();
      if (typeof leadsData.tenantBrandName === "string") {
        setTenantBrandName(leadsData.tenantBrandName);
      }
      const loadedLeads: AdminLead[] = leadsData.leads ?? [];
      setLeads(loadedLeads);

      const leadIds = loadedLeads
        .slice(0, 50)
        .map((lead) => lead.id)
        .join(",");

      if (leadIds) {
        const analyticsRes = await adminFetch(
          `/api/admin/analytics?leadIds=${encodeURIComponent(leadIds)}`
        );

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();
          setLeadJourneys(analyticsData.leadJourneys ?? {});
        }
      } else {
        setLeadJourneys({});
      }
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial admin load after auth
    void fetchLeads();
  }, [fetchLeads]);

  if (error) {
    return (
      <AdminPageShell title="Lead Dashboard" subtitle="Internal lead management">
        <p className="text-sm text-red-600">{error}</p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Lead Dashboard"
      subtitle={`${tenantBrandName} · ${leads.length} total · ${filteredLeads.length} shown`}
      actions={
        <Button variant="secondary" onClick={() => void fetchLeads()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <AdminPipelineSummary leads={leads} />

      <section className="mb-8">
        <div className="mb-4">
          <h2 className="font-serif text-2xl text-navy">SEO attribution</h2>
          <p className="text-sm text-gray-500">
            Landing page and UTM source for each lead (filtered view).
          </p>
        </div>
        <AdminSeoAttributionTable leads={filteredLeads} />
      </section>

      <AdminLeadFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filteredLeads.length}
        onExport={() => exportLeadsToCsv(filteredLeads)}
      />

      <AdminLeadTable
        leads={filteredLeads}
        leadJourneys={leadJourneys}
        onRefresh={() => void fetchLeads()}
      />
    </AdminPageShell>
  );
}

export function AdminPageView() {
  const tenant = getDefaultTenant();
  return (
    <AdminAuthGate
      title="Lead Dashboard"
      description={`Internal access for ${tenant.brandName}`}
    >
      <AdminLeadsDashboard />
    </AdminAuthGate>
  );
}

export default function AdminPage() {
  return <AdminPageView />;
}
