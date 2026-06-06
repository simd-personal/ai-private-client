"use client";

import { Input } from "@/components/ui/input";
import { SITE_EVENT_NAMES } from "@/lib/schemas/site-analytics";

export type ActivityDateRange = "7d" | "30d" | "all";

export interface ActivityFiltersState {
  eventType: "all" | (typeof SITE_EVENT_NAMES)[number];
  pagePathSearch: string;
  linkedLeadOnly: boolean;
  dateRange: ActivityDateRange;
}

export const defaultActivityFilters: ActivityFiltersState = {
  eventType: "all",
  pagePathSearch: "",
  linkedLeadOnly: false,
  dateRange: "7d",
};

export function AdminActivityFilters({
  filters,
  onChange,
  resultCount,
}: {
  filters: ActivityFiltersState;
  onChange: (filters: ActivityFiltersState) => void;
  resultCount: number;
}) {
  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-navy">Activity filters</p>
        <p className="text-xs text-gray-500">{resultCount} events shown</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="text-gray-500">Event type</span>
          <select
            value={filters.eventType}
            onChange={(event) =>
              onChange({
                ...filters,
                eventType: event.target.value as ActivityFiltersState["eventType"],
              })
            }
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-navy"
          >
            <option value="all">All events</option>
            {SITE_EVENT_NAMES.map((eventName) => (
              <option key={eventName} value={eventName}>
                {eventName}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-gray-500">Page path search</span>
          <Input
            placeholder="/tools, /buyer..."
            value={filters.pagePathSearch}
            onChange={(event) =>
              onChange({ ...filters, pagePathSearch: event.target.value })
            }
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-gray-500">Date range</span>
          <select
            value={filters.dateRange}
            onChange={(event) =>
              onChange({
                ...filters,
                dateRange: event.target.value as ActivityDateRange,
              })
            }
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-navy"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="all">All loaded events</option>
          </select>
        </label>

        <label className="flex h-10 items-end gap-2 text-sm">
          <input
            id="linked-lead-only"
            type="checkbox"
            checked={filters.linkedLeadOnly}
            onChange={(event) =>
              onChange({ ...filters, linkedLeadOnly: event.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-gray-600">Linked lead only</span>
        </label>
      </div>
    </div>
  );
}

export function filterActivityRows<
  T extends { createdAt: string; eventName: string; pagePath: string | null; leadId: string | null },
>(rows: T[], filters: ActivityFiltersState): T[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const rangeDays =
    filters.dateRange === "7d" ? 7 : filters.dateRange === "30d" ? 30 : null;

  return rows.filter((row) => {
    if (filters.eventType !== "all" && row.eventName !== filters.eventType) {
      return false;
    }

    if (
      filters.pagePathSearch.trim() &&
      !row.pagePath?.toLowerCase().includes(filters.pagePathSearch.trim().toLowerCase())
    ) {
      return false;
    }

    if (filters.linkedLeadOnly && !row.leadId) {
      return false;
    }

    if (rangeDays != null) {
      const age = now - new Date(row.createdAt).getTime();
      if (age > rangeDays * dayMs) {
        return false;
      }
    }

    return true;
  });
}
