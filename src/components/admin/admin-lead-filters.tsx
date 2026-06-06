"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_PIPELINE_STATUS_LABELS,
  LEAD_STATUSES,
  type LeadPipelineStatus,
} from "@/lib/constants";

export type LeadTypeFilter =
  | "all"
  | "buyer"
  | "seller"
  | "equity"
  | "wealth_forecast";
export type TemperatureFilter = "all" | "cold" | "warm" | "hot";
export type StatusFilter = "all" | (typeof LEAD_STATUSES)[number];
export type PipelineStatusFilter = "all" | LeadPipelineStatus;
export type SortOption = "newest" | "score" | "follow_up";

export interface AdminFiltersState {
  search: string;
  leadType: LeadTypeFilter;
  temperature: TemperatureFilter;
  status: StatusFilter;
  pipelineStatus: PipelineStatusFilter;
  sort: SortOption;
}

interface AdminLeadFiltersProps {
  filters: AdminFiltersState;
  onChange: (filters: AdminFiltersState) => void;
  resultCount: number;
  onExport: () => void;
}

export function AdminLeadFilters({
  filters,
  onChange,
  resultCount,
  onExport,
}: AdminLeadFiltersProps) {
  const set = (patch: Partial<AdminFiltersState>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="mb-6 space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Showing {resultCount} lead{resultCount !== 1 ? "s" : ""}
        </p>
        <Button variant="secondary" size="sm" onClick={onExport}>
          Export CSV
        </Button>
      </div>

      <Input
        placeholder="Search name, email, phone, or city..."
        value={filters.search}
        onChange={(e) => set({ search: e.target.value })}
      />

      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={filters.leadType}
          onChange={(e) => set({ leadType: e.target.value as LeadTypeFilter })}
        >
          <option value="all">All types</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="equity">Equity</option>
          <option value="wealth_forecast">Wealth Forecast</option>
        </select>

        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={filters.temperature}
          onChange={(e) =>
            set({ temperature: e.target.value as TemperatureFilter })
          }
        >
          <option value="all">All temperatures</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>

        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={filters.status}
          onChange={(e) => set({ status: e.target.value as StatusFilter })}
        >
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={filters.pipelineStatus}
          onChange={(e) =>
            set({ pipelineStatus: e.target.value as PipelineStatusFilter })
          }
        >
          <option value="all">All pipeline stages</option>
          {LEAD_PIPELINE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_PIPELINE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>

        <select
          className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm"
          value={filters.sort}
          onChange={(e) => set({ sort: e.target.value as SortOption })}
        >
          <option value="newest">Newest first</option>
          <option value="score">Highest score first</option>
          <option value="follow_up">Next follow up first</option>
        </select>
      </div>
    </div>
  );
}
