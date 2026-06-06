"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  LEAD_PIPELINE_STATUSES,
  LEAD_PIPELINE_STATUS_LABELS,
  type LeadPipelineStatus,
} from "@/lib/constants";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";

export interface LeadCrmPatch {
  lead_status: LeadPipelineStatus;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  lost_reason: string | null;
  estimated_deal_value: number | null;
  estimated_commission: number | null;
  closed_at: string | null;
}

interface AdminLeadPipelineSectionProps {
  leadStatus: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  lostReason: string | null;
  estimatedDealValue: number | null;
  estimatedCommission: number | null;
  closedAt: string | null;
  concierge: LeadConcierge | null;
  saving: boolean;
  onSave: (patch: LeadCrmPatch) => void;
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateInputToIso(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function numberToInput(value: number | null): string {
  return value == null ? "" : String(value);
}

function inputToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function AdminLeadPipelineSection({
  leadStatus,
  lastContactedAt,
  nextFollowUpAt,
  lostReason,
  estimatedDealValue,
  estimatedCommission,
  closedAt,
  concierge,
  saving,
  onSave,
}: AdminLeadPipelineSectionProps) {
  const [status, setStatus] = useState<LeadPipelineStatus>(
    (leadStatus as LeadPipelineStatus) ?? "new"
  );
  const [lastContacted, setLastContacted] = useState(
    isoToDateInput(lastContactedAt)
  );
  const [nextFollowUp, setNextFollowUp] = useState(
    isoToDateInput(nextFollowUpAt)
  );
  const [lostReasonText, setLostReasonText] = useState(lostReason ?? "");
  const [dealValue, setDealValue] = useState(numberToInput(estimatedDealValue));
  const [commission, setCommission] = useState(
    numberToInput(estimatedCommission)
  );
  const [closed, setClosed] = useState(isoToDateInput(closedAt));

  const handleSave = () => {
    onSave({
      lead_status: status,
      last_contacted_at: dateInputToIso(lastContacted),
      next_follow_up_at: dateInputToIso(nextFollowUp),
      lost_reason: status === "lost" ? lostReasonText.trim() || null : null,
      estimated_deal_value: inputToNumber(dealValue),
      estimated_commission: inputToNumber(commission),
      closed_at: dateInputToIso(closed),
    });
  };

  return (
    <div className="mb-4 rounded-xl border border-navy/10 bg-navy/5 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-serif text-lg text-navy">Lead Pipeline</p>
        <Badge variant="champagne">
          {LEAD_PIPELINE_STATUS_LABELS[
            (leadStatus as LeadPipelineStatus) ?? "new"
          ] ?? leadStatus}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-gray-500">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadPipelineStatus)}
            className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm"
          >
            {LEAD_PIPELINE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {LEAD_PIPELINE_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-gray-500">Last contacted</span>
          <Input
            type="date"
            value={lastContacted}
            onChange={(e) => setLastContacted(e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-gray-500">Next follow up</span>
          <Input
            type="date"
            value={nextFollowUp}
            onChange={(e) => setNextFollowUp(e.target.value)}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-gray-500">Estimated deal value</span>
          <Input
            type="number"
            min="0"
            value={dealValue}
            onChange={(e) => setDealValue(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-gray-500">Estimated commission</span>
          <Input
            type="number"
            min="0"
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-gray-500">Closed date</span>
          <Input
            type="date"
            value={closed}
            onChange={(e) => setClosed(e.target.value)}
          />
        </label>
      </div>

      {status === "lost" ? (
        <label className="mt-3 block space-y-1">
          <span className="text-gray-500">Lost reason</span>
          <Textarea
            value={lostReasonText}
            onChange={(e) => setLostReasonText(e.target.value)}
            rows={2}
            placeholder="Why was this lead lost?"
          />
        </label>
      ) : null}

      {concierge ? (
        <div className="mt-3 rounded-lg border border-champagne/40 bg-champagne/10 p-3">
          <p className="font-medium text-navy">Recommended next action</p>
          <p className="mt-1 text-gray-700">{concierge.nextBestAction}</p>
          <p className="mt-2 text-xs text-gray-500">
            Suggested cadence: {concierge.recommendedFollowUpTimeline}
          </p>
        </div>
      ) : null}

      <Button
        size="sm"
        className="mt-3"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? "Saving..." : "Save CRM Updates"}
      </Button>
    </div>
  );
}
