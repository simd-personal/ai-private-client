"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminActivityFilters, defaultActivityFilters, filterActivityRows } from "@/components/admin/admin-activity-filters";
import {
  AdminAnalyticsSection,
  type AdminRecentActivityRow,
} from "@/components/admin/admin-analytics-section";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { AdminAnalyticsSummary } from "@/lib/analytics/server";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function AdminActivityDashboard() {
  const fallbackTenant = getDefaultTenant();
  const [tenantBrandName, setTenantBrandName] = useState(
    fallbackTenant.brandName
  );
  const [summary, setSummary] = useState<AdminAnalyticsSummary | null>(null);
  const [recentActivity, setRecentActivity] = useState<AdminRecentActivityRow[]>(
    []
  );
  const [filters, setFilters] = useState(defaultActivityFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/analytics");
      if (res.status === 401) {
        setError("Session expired. Please log in again.");
        return;
      }
      if (!res.ok) {
        setError("Failed to load website activity");
        return;
      }
      const data = await res.json();
      if (typeof data.tenantBrandName === "string") {
        setTenantBrandName(data.tenantBrandName);
      }
      setSummary(data.summary ?? null);
      setRecentActivity(data.recentActivity ?? []);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial admin load after auth
    void fetchAnalytics();
  }, [fetchAnalytics]);

  const filteredActivity = useMemo(
    () => filterActivityRows(recentActivity, filters),
    [recentActivity, filters]
  );

  if (error) {
    return (
      <AdminPageShell
        title="Website Activity"
        subtitle={`${tenantBrandName} · First-party analytics for anonymous site behavior`}
        wide
        actions={
          <Button variant="secondary" onClick={() => void fetchAnalytics()} disabled={loading}>
            Refresh
          </Button>
        }
      >
        <p className="text-sm text-red-600">{error}</p>
      </AdminPageShell>
    );
  }

  if (!summary) {
    return (
      <AdminPageShell
        title="Website Activity"
        subtitle={`${tenantBrandName} · First-party analytics for anonymous site behavior`}
        wide
      >
        <p className="text-sm text-gray-500">
          {loading ? "Loading activity..." : "No activity data available."}
        </p>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell
      title="Website Activity"
      subtitle={`${tenantBrandName} · First-party analytics for anonymous site behavior`}
      wide
      actions={
        <Button variant="secondary" onClick={() => void fetchAnalytics()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      }
    >
      <AdminActivityFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filteredActivity.length}
      />
      <AdminAnalyticsSection summary={summary} recentActivity={filteredActivity} />
    </AdminPageShell>
  );
}
