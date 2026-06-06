"use client";

import type { AdminLead } from "@/components/admin/admin-lead-table";

interface AdminSeoAttributionTableProps {
  leads: AdminLead[];
}

function formatAttribution(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

export function AdminSeoAttributionTable({ leads }: AdminSeoAttributionTableProps) {
  if (leads.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        No leads available for SEO attribution.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-gray-100 bg-beige/20 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Landing page</th>
            <th className="px-4 py-3 font-medium">Referrer</th>
            <th className="px-4 py-3 font-medium">UTM source</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Score</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-gray-50 last:border-0">
              <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                {new Date(lead.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-navy">
                {formatAttribution(lead.landing_page)}
              </td>
              <td className="max-w-xs truncate px-4 py-3 text-gray-600">
                {formatAttribution(lead.referrer)}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {formatAttribution(lead.utm_source)}
              </td>
              <td className="px-4 py-3 capitalize text-gray-600">{lead.lead_type}</td>
              <td className="px-4 py-3 text-gray-600">
                {lead.lead_score}
                <span className="ml-1 text-xs text-gray-400">
                  ({lead.lead_temperature})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
