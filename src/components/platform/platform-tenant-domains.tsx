"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { platformAdminFetch } from "@/lib/platform-admin/fetch";
import {
  DOMAIN_STATUSES,
  type DomainStatus,
  type DomainType,
} from "@/lib/platform-admin/domain-utils";

interface TenantDomain {
  id: string;
  domain: string;
  domain_type: DomainType;
  status: DomainStatus;
  verified_at: string | null;
  created_at: string;
}

interface PlatformTenantDomainsProps {
  tenantSlug: string;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export function PlatformTenantDomains({ tenantSlug }: PlatformTenantDomainsProps) {
  const [domains, setDomains] = useState<TenantDomain[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newDomain, setNewDomain] = useState("");
  const [newDomainType, setNewDomainType] = useState<DomainType>("custom_domain");
  const [saving, setSaving] = useState(false);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await platformAdminFetch(
        `/api/platform/tenants/${tenantSlug}/domains`
      );
      const data = (await res.json()) as
        | { domains?: TenantDomain[]; error?: string }
        | undefined;
      if (!res.ok || !data?.domains) {
        setError(data?.error ?? "Failed to load domains");
        return;
      }
      setDomains(data.domains);
    } catch {
      setError("Failed to connect");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial domains load
    void fetchDomains();
  }, [fetchDomains]);

  const handleAddDomain = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await platformAdminFetch(
        `/api/platform/tenants/${tenantSlug}/domains`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            domain: newDomain,
            domain_type: newDomainType,
          }),
        }
      );
      const data = (await res.json()) as
        | { domain?: TenantDomain; error?: string; details?: { fieldErrors?: Record<string, string[]> } }
        | undefined;

      if (!res.ok || !data?.domain) {
        const fieldErrors = data?.details?.fieldErrors;
        const fieldMessage = fieldErrors
          ? Object.entries(fieldErrors)
              .flatMap(([field, messages]) =>
                messages?.length ? [`${field}: ${messages.join(", ")}`] : []
              )
              .join(" ")
          : null;
        setError(fieldMessage || data?.error || "Failed to add domain");
        return;
      }

      setNewDomain("");
      setNewDomainType("custom_domain");
      setSuccess("Domain added with pending status.");
      await fetchDomains();
    } catch {
      setError("Failed to connect");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (domainId: string, status: DomainStatus) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await platformAdminFetch(
        `/api/platform/tenants/${tenantSlug}/domains/${domainId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      const data = (await res.json()) as { error?: string } | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to update domain");
        return;
      }
      setSuccess("Domain updated.");
      await fetchDomains();
    } catch {
      setError("Failed to connect");
    }
  };

  const handleDelete = async (domainId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await platformAdminFetch(
        `/api/platform/tenants/${tenantSlug}/domains/${domainId}`,
        { method: "DELETE" }
      );
      const data = (await res.json()) as { error?: string } | undefined;
      if (!res.ok) {
        setError(data?.error ?? "Failed to delete domain");
        return;
      }
      setSuccess("Domain removed.");
      await fetchDomains();
    } catch {
      setError("Failed to connect");
    }
  };

  const dnsInstruction =
    newDomainType === "platform_subdomain"
      ? `Use ${tenantSlug}.yourplatform.com once platform subdomains are enabled.`
      : "Add a CNAME record pointing to your Vercel target (e.g. cname.vercel-dns.com).";

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <p className="mb-1 text-sm font-medium text-navy">Domains</p>
      <p className="mb-4 text-xs text-gray-500">
        Map custom domains or platform subdomains to this tenant. Adding a domain
        creates a pending record; set it to active once DNS is verified.
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-beige/30 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Domain</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Verified At</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain.id} className="border-t border-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{domain.domain}</td>
                <td className="px-4 py-3">
                  {domain.domain_type === "platform_subdomain"
                    ? "Platform subdomain"
                    : "Custom domain"}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={domain.status}
                    onChange={(e) =>
                      void handleStatusChange(
                        domain.id,
                        e.target.value as DomainStatus
                      )
                    }
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                  >
                    {DOMAIN_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{formatDate(domain.verified_at)}</td>
                <td className="px-4 py-3">{formatDate(domain.created_at)}</td>
                <td className="px-4 py-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDelete(domain.id)}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && domains.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No domains yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={handleAddDomain}
        className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      >
        <label className="block space-y-1">
          <span className="text-sm text-gray-600">Add domain</span>
          <Input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            placeholder="tools.demoagent.com"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-gray-600">Type</span>
          <select
            value={newDomainType}
            onChange={(e) => setNewDomainType(e.target.value as DomainType)}
            className="h-12 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          >
            <option value="custom_domain">Custom domain</option>
            <option value="platform_subdomain">Platform subdomain</option>
          </select>
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add domain"}
        </Button>
      </form>

      <div className="mt-4 rounded-xl border border-gray-100 bg-beige/20 p-4 text-xs text-gray-600">
        <p className="font-medium text-navy">DNS instructions</p>
        <p className="mt-1">{dnsInstruction}</p>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-green-700">{success}</p> : null}
    </div>
  );
}
