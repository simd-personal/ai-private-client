"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  BUDGET_LABELS,
  EQUITY_GOAL_LABELS,
  EQUITY_TIMELINE_LABELS,
  LEAD_PIPELINE_STATUS_LABELS,
  LEAD_STATUSES,
  TIMELINE_LABELS,
  type LeadPipelineStatus,
  WEALTH_LEVERAGE_LABELS,
  WEALTH_LIQUIDITY_LABELS,
  WEALTH_PROPERTY_USE_LABELS,
  WEALTH_TIMELINE_LABELS,
} from "@/lib/constants";
import { calculateEquityMove, formatCurrency } from "@/lib/equity/calculateEquityMove";
import { calculateWealthForecast } from "@/lib/wealth/calculateWealthForecast";
import { getLeadConciergeFromQuizData } from "@/lib/schemas/lead-concierge";
import { AdminAiStrategySection } from "@/components/admin/admin-ai-strategy-section";
import { AdminLeadConciergeSection } from "@/components/admin/admin-lead-concierge-section";
import {
  AdminLeadPipelineSection,
  type LeadCrmPatch,
} from "@/components/admin/admin-lead-pipeline-section";
import { AdminLeadCommentsSection } from "@/components/admin/admin-lead-comments-section";
import { AdminEquityPropertyIntelligenceSection } from "@/components/admin/admin-equity-property-intelligence-section";
import { AdminPropertyIntelligenceSection } from "@/components/admin/admin-property-intelligence-section";
import type { EquityPropertyIntelligence } from "@/lib/property/equityPropertyTypes";
import { AdminLeadSessionJourney } from "@/components/admin/admin-lead-session-journey";
import type { PropertyIntelligence } from "@/lib/property/types";
import { adminFetch } from "@/lib/admin/admin-fetch";
import type { LeadSessionJourney } from "@/lib/analytics/server";
import { toAdminStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import { toAdminDecisionLayerData } from "@/lib/schemas/decision-layer";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";

type StoredWealthQuizData = WealthQuizData & {
  calculations?: ReturnType<typeof calculateWealthForecast>;
};

export interface AdminLead {
  id: string;
  created_at: string;
  lead_type: "buyer" | "seller" | "equity" | "wealth_forecast";
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  lead_score: number;
  lead_temperature: "cold" | "warm" | "hot";
  internal_lead_summary: string;
  suggested_follow_up_message: string;
  status: string;
  admin_notes: string | null;
  lead_status: string | null;
  last_contacted_at: string | null;
  next_follow_up_at: string | null;
  lead_notes: string | null;
  lost_reason: string | null;
  estimated_deal_value: number | null;
  estimated_commission: number | null;
  closed_at: string | null;
  report_source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  landing_page: string | null;
  referrer: string | null;
  gclid: string | null;
  fbclid: string | null;
  ai_strategy_room?: unknown;
  ai_scenario_comparison?: unknown;
  ai_advisor_coordination_map?: unknown;
  ai_advisor_specific_briefs?: unknown;
  ai_deal_readiness?: unknown;
  ai_relationship_map?: unknown;
  ai_meeting_prep_pack?: unknown;
  ai_white_glove_follow_up?: unknown;
  ai_red_flags_missing_info?: unknown;
  ai_presentation_mode?: unknown;
  ai_demo_version?: string | null;
  ai_generated_at?: string | null;
  ai_generation_source?: string | null;
  ai_generation_model?: string | null;
  ai_decision_graph?: unknown;
  ai_compliance_guardrails?: unknown;
  ai_decision_timeline_summary?: unknown;
  ai_data_room_suggestions?: unknown;
  decision_stage?: string | null;
  quiz_data:
    | BuyerQuizData
    | (SellerQuizData & {
        propertyIntelligence?: PropertyIntelligence;
        propertyAdminNotes?: string;
      })
    | (EquityQuizData & {
        equityPropertyIntelligence?: EquityPropertyIntelligence;
      })
    | StoredWealthQuizData;
}

interface AdminLeadTableProps {
  leads: AdminLead[];
  leadJourneys: Record<string, LeadSessionJourney>;
  onRefresh: () => void;
  tenantSlug?: string;
}

function getTimeline(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "buyer") return TIMELINE_LABELS[q.timeline] ?? q.timeline;
  if (q.leadType === "equity") {
    return EQUITY_TIMELINE_LABELS[q.timeline] ?? q.timeline;
  }
  if (q.leadType === "wealth_forecast") {
    return WEALTH_TIMELINE_LABELS[q.timeline] ?? q.timeline;
  }
  const key = q.sellingTimeline as keyof typeof TIMELINE_LABELS;
  return TIMELINE_LABELS[key] ?? q.sellingTimeline;
}

function getBudgetOrValue(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "equity") {
    return q.estimatedCurrentValue != null
      ? formatCurrency(q.estimatedCurrentValue)
      : "Value TBD";
  }
  if (q.leadType === "wealth_forecast") {
    return formatCurrency(q.purchasePrice);
  }
  const range =
    q.leadType === "buyer" ? q.budgetRange : q.estimatedValueRange;
  return BUDGET_LABELS[range] ?? range;
}

function getLocation(lead: AdminLead): string {
  const q = lead.quiz_data;
  if (q.leadType === "buyer") return q.desiredLocations.join(", ");
  if (q.leadType === "equity") {
    const city = q.propertyAddress?.city ?? q.currentHomeCity;
    const state = q.propertyAddress?.state ?? q.currentHomeState;
    return `${city}, ${state}`;
  }
  if (q.leadType === "wealth_forecast") {
    return q.targetLocations.join(", ");
  }
  return `${q.propertyAddress.city}, ${q.propertyAddress.state}`;
}

function getEquityDetails(lead: AdminLead): string | null {
  if (lead.quiz_data.leadType !== "equity") return null;
  const calcs = calculateEquityMove(lead.quiz_data);
  const parts = [
    calcs.grossEquity != null
      ? `Gross equity ${formatCurrency(calcs.grossEquity)}`
      : null,
    calcs.ownershipYears != null ? `${calcs.ownershipYears} yrs owned` : null,
    EQUITY_GOAL_LABELS[lead.quiz_data.nextMoveGoal],
  ].filter(Boolean);
  return parts.join(" · ");
}

function getWealthForecastDetails(lead: AdminLead): string | null {
  if (lead.quiz_data.leadType !== "wealth_forecast") return null;
  const q = lead.quiz_data;
  const calcs =
    q.calculations ?? calculateWealthForecast(q);
  const parts = [
    calcs.downPaymentAmount != null
      ? `Down ${formatCurrency(calcs.downPaymentAmount)}`
      : null,
    calcs.loanAmount != null ? `Loan ${formatCurrency(calcs.loanAmount)}` : null,
    WEALTH_PROPERTY_USE_LABELS[q.propertyUse],
    `${q.holdPeriodYears} yr hold`,
    calcs.estimatedMonthlyCarry != null
      ? `Carry ${formatCurrency(calcs.estimatedMonthlyCarry)}/mo`
      : null,
    WEALTH_LIQUIDITY_LABELS[q.liquiditySituation],
    WEALTH_LEVERAGE_LABELS[q.leveragePreference],
  ].filter(Boolean);
  return parts.join(" · ");
}

function formatAttributionValue(value: string | null | undefined): string {
  return value?.trim() ? value : "—";
}

function LeadAttributionSection({ lead }: { lead: AdminLead }) {
  const fields = [
    { label: "Landing page", value: lead.landing_page },
    { label: "Referrer", value: lead.referrer },
    { label: "UTM source", value: lead.utm_source },
    { label: "UTM medium", value: lead.utm_medium },
    { label: "UTM campaign", value: lead.utm_campaign },
    { label: "UTM term", value: lead.utm_term },
    { label: "UTM content", value: lead.utm_content },
    { label: "GCLID", value: lead.gclid },
    { label: "FBCLID", value: lead.fbclid },
  ];

  return (
    <div className="mb-4 rounded-xl border border-gray-100 bg-white p-4 text-sm">
      <p className="mb-3 font-medium text-navy">Organic attribution</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <div key={field.label}>
            <span className="text-gray-400">{field.label}: </span>
            <span className="break-all text-gray-700">
              {formatAttributionValue(field.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1">
      {copied ? (
        <>
          <Check className="h-3 w-3" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" /> Copy
        </>
      )}
    </Button>
  );
}

export function AdminLeadTable({
  leads,
  leadJourneys,
  onRefresh,
  tenantSlug,
}: AdminLeadTableProps) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [propertyNotesDraft, setPropertyNotesDraft] = useState<
    Record<string, string>
  >({});

  const updateLead = async (
    leadId: string,
    patch: {
      status?: string;
      notes?: string;
      propertyAdminNotes?: string;
    } & Partial<LeadCrmPatch>
  ) => {
    setUpdating(leadId);
    try {
      await adminFetch("/api/admin/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ leadId, ...patch }),
      });
      onRefresh();
    } finally {
      setUpdating(null);
    }
  };

  if (leads.length === 0) {
    return (
      <p className="py-12 text-center text-gray-500">No leads match your filters.</p>
    );
  }

  return (
    <div className="space-y-6">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-serif text-xl text-navy">
                {lead.first_name} {lead.last_name}
              </h3>
              <p className="text-sm text-gray-500">
                {lead.email}
                {lead.phone ? ` · ${lead.phone}` : ""}
              </p>
              {lead.report_source && (
                <p className="mt-1 text-xs text-gray-400 capitalize">
                  Report: {lead.report_source}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="capitalize">
                {lead.lead_type}
              </Badge>
              <Badge
                variant={
                  lead.lead_temperature === "hot"
                    ? "hot"
                    : lead.lead_temperature === "warm"
                      ? "warm"
                      : "cold"
                }
              >
                {lead.lead_temperature} · {lead.lead_score}
              </Badge>
              <Badge variant="champagne">
                {LEAD_PIPELINE_STATUS_LABELS[
                  (lead.lead_status as LeadPipelineStatus) ?? "new"
                ] ?? lead.lead_status ?? "New"}
              </Badge>
              {lead.next_follow_up_at ? (
                <span className="text-xs text-gray-500">
                  Follow up:{" "}
                  {new Date(lead.next_follow_up_at).toLocaleDateString()}
                </span>
              ) : null}
            </div>
          </div>

          <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <span className="text-gray-400">Timeline: </span>
              {getTimeline(lead)}
            </div>
            <div>
              <span className="text-gray-400">
                {lead.lead_type === "equity"
                  ? "Est. value: "
                  : lead.lead_type === "wealth_forecast"
                    ? "Purchase: "
                    : "Budget/Value: "}
              </span>
              {getBudgetOrValue(lead)}
            </div>
            <div>
              <span className="text-gray-400">Location: </span>
              {getLocation(lead)}
            </div>
            <div>
              <span className="text-gray-400">Created: </span>
              {new Date(lead.created_at).toLocaleDateString()}
            </div>
          </div>

          {getEquityDetails(lead) && (
            <p className="mb-4 text-sm text-gray-600">{getEquityDetails(lead)}</p>
          )}
          {getWealthForecastDetails(lead) && (
            <p className="mb-4 text-sm text-gray-600">
              {getWealthForecastDetails(lead)}
            </p>
          )}

          <LeadAttributionSection lead={lead} />

          <AdminLeadSessionJourney journey={leadJourneys[lead.id]} />

          <AdminAiStrategySection
            leadId={lead.id}
            strategyData={toAdminStrategyRoomData(lead)}
            decisionData={toAdminDecisionLayerData(lead)}
            internalSummary={lead.internal_lead_summary}
            suggestedFollowUp={lead.suggested_follow_up_message}
            concierge={getLeadConciergeFromQuizData(
              lead.quiz_data as Record<string, unknown>
            )}
            tenantSlug={tenantSlug}
            onRegenerated={onRefresh}
          />

          <AdminLeadPipelineSection
            leadStatus={lead.lead_status}
            lastContactedAt={lead.last_contacted_at}
            nextFollowUpAt={lead.next_follow_up_at}
            lostReason={lead.lost_reason}
            estimatedDealValue={lead.estimated_deal_value}
            estimatedCommission={lead.estimated_commission}
            closedAt={lead.closed_at}
            concierge={getLeadConciergeFromQuizData(
              lead.quiz_data as Record<string, unknown>
            )}
            saving={updating === lead.id}
            onSave={(patch) => updateLead(lead.id, patch)}
          />

          <AdminLeadCommentsSection leadId={lead.id} />

          {lead.lead_type === "equity" &&
            lead.quiz_data.leadType === "equity" && (
              <AdminEquityPropertyIntelligenceSection
                intelligence={lead.quiz_data.equityPropertyIntelligence}
                currentValueSource={
                  calculateEquityMove(lead.quiz_data, {
                    equityPropertyIntelligence:
                      lead.quiz_data.equityPropertyIntelligence,
                  }).currentValueSource
                }
                userUsedValue={lead.quiz_data.estimatedCurrentValue}
              />
            )}

          {lead.lead_type === "seller" &&
            lead.quiz_data.leadType === "seller" && (
              <>
                <AdminPropertyIntelligenceSection
                  intelligence={lead.quiz_data.propertyIntelligence}
                />
                <div className="mb-4">
                  <p className="mb-2 text-sm font-medium text-navy">
                    Property Admin Notes
                  </p>
                  <Textarea
                    placeholder="Internal property notes for strategy (stored in quiz data)..."
                    value={
                      propertyNotesDraft[lead.id] ??
                      lead.quiz_data.propertyAdminNotes ??
                      ""
                    }
                    onChange={(e) =>
                      setPropertyNotesDraft((prev) => ({
                        ...prev,
                        [lead.id]: e.target.value,
                      }))
                    }
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={updating === lead.id}
                    onClick={() => {
                      const q = lead.quiz_data;
                      if (q.leadType !== "seller") return;
                      updateLead(lead.id, {
                        propertyAdminNotes:
                          propertyNotesDraft[lead.id] ??
                          q.propertyAdminNotes ??
                          "",
                      });
                    }}
                  >
                    Save Property Notes
                  </Button>
                  <p className="mt-2 text-xs text-gray-400">
                    TODO: Regenerate Seller Strategy With Notes — wire admin
                    endpoint when ready.
                  </p>
                </div>
              </>
            )}

          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-navy">Admin Notes</p>
            <Textarea
              placeholder="Add notes about this lead..."
              value={notesDraft[lead.id] ?? lead.admin_notes ?? ""}
              onChange={(e) =>
                setNotesDraft((prev) => ({
                  ...prev,
                  [lead.id]: e.target.value,
                }))
              }
              rows={3}
            />
            <Button
              size="sm"
              variant="secondary"
              className="mt-2"
              disabled={updating === lead.id}
              onClick={() =>
                updateLead(lead.id, {
                  notes: notesDraft[lead.id] ?? lead.admin_notes ?? "",
                })
              }
            >
              Save Notes
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.map((status) => (
              <Button
                key={status}
                size="sm"
                variant={lead.status === status ? "default" : "secondary"}
                disabled={updating === lead.id}
                onClick={() => updateLead(lead.id, { status })}
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
