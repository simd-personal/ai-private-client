"use client";

import { summarizeSiteEventMetadata } from "@/lib/schemas/site-analytics";
import type { AdminAnalyticsSummary } from "@/lib/analytics/server";

export interface AdminRecentActivityRow {
  id: string;
  createdAt: string;
  eventName: string;
  pagePath: string | null;
  sessionId: string;
  leadId: string | null;
  leadType: string | null;
  metadata: Record<string, unknown>;
}

interface AdminAnalyticsSectionProps {
  summary: AdminAnalyticsSummary;
  recentActivity: AdminRecentActivityRow[];
}

function shortSessionId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 font-serif text-3xl text-navy">{value}</p>
    </div>
  );
}

export function AdminAnalyticsSection({
  summary,
  recentActivity,
}: AdminAnalyticsSectionProps) {
  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Sessions (7d)" value={summary.sessionsLast7Days} />
        <StatCard label="Page views (7d)" value={summary.pageViewsLast7Days} />
        <StatCard label="Tool starts (7d)" value={summary.toolStartsLast7Days} />
        <StatCard
          label="Lead submissions (7d)"
          value={summary.leadSubmissionsLast7Days}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankedList
          title="Top landing pages"
          items={summary.topLandingPages.map((item) => ({
            label: item.pagePath,
            count: item.count,
          }))}
        />
        <RankedList
          title="Top CTA clicks"
          items={summary.topCtaClicks.map((item) => ({
            label: item.destinationTool,
            count: item.count,
          }))}
        />
        <RankedList
          title="Top tool starts"
          items={summary.topToolStarts.map((item) => ({
            label: item.leadType,
            count: item.count,
          }))}
        />
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-medium text-navy">Conversion by tool</h3>
          {summary.conversionByTool.length === 0 ? (
            <p className="text-sm text-gray-500">No quiz starts yet.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {summary.conversionByTool.map((row) => (
                <li
                  key={row.leadType}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="capitalize text-gray-700">{row.leadType}</span>
                  <span className="text-gray-500">
                    {row.leadsCreated}/{row.quizStarts} · {row.conversionRate}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-100 bg-beige/20 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Event</th>
              <th className="px-4 py-3 font-medium">Page</th>
              <th className="px-4 py-3 font-medium">Session</th>
              <th className="px-4 py-3 font-medium">Lead</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {recentActivity.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              recentActivity.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-navy">{row.eventName}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {row.pagePath ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {shortSessionId(row.sessionId)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {row.leadId ? row.leadId.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-3 capitalize text-gray-600">
                    {row.leadType ?? "—"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-500">
                    {summarizeSiteEventMetadata(row.metadata)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankedList({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; count: number }>;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-medium text-navy">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.label} className="flex items-center justify-between gap-4">
              <span className="truncate font-mono text-xs text-gray-700">
                {item.label}
              </span>
              <span className="text-gray-500">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
