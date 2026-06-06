"use client";

import { useEffect, useState } from "react";
import { AdvisorActionBoardAdmin } from "@/components/ai/AdvisorActionBoard";
import { AdvisorBriefsPanel } from "@/components/ai/AdvisorBriefsPanel";
import { AdvisorCoordinationMapPanel } from "@/components/ai/AdvisorCoordinationMap";
import { ComplianceGuardrailsPanel } from "@/components/ai/ComplianceGuardrailsPanel";
import { DataRoomChecklist } from "@/components/ai/DataRoomChecklist";
import { DealReadinessScore } from "@/components/ai/DealReadinessScore";
import { DecisionGraphPanel } from "@/components/ai/DecisionGraph";
import { DecisionTimeline } from "@/components/ai/DecisionTimeline";
import { MeetingCopilot } from "@/components/ai/MeetingCopilot";
import { MeetingPrepPackPanel } from "@/components/ai/MeetingPrepPack";
import { MissingInfoPanel } from "@/components/ai/MissingInfoPanel";
import { PresentBriefButton, PresentationModeViewer } from "@/components/ai/PresentationMode";
import { ScenarioComparisonPanel } from "@/components/ai/ScenarioComparison";
import { StrategyRoomCard } from "@/components/ai/StrategyRoomCard";
import { WhiteGloveFollowUpPanel } from "@/components/ai/WhiteGloveFollowUp";
import { AdminLeadConciergeSection } from "@/components/admin/admin-lead-concierge-section";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  trackFollowupCopied,
  trackMeetingPrepViewed,
} from "@/lib/analytics";
import type { AdminStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import { calculateDataRoomCompletion } from "@/lib/data-room/calculateDataRoomCompletion";
import { READINESS_LABEL_DISPLAY } from "@/lib/schemas/ai-strategy-room";
import type { AdminDecisionLayerData, DataRoomItem } from "@/lib/schemas/decision-layer";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";

const TABS = [
  "Strategy Room",
  "Decision Graph",
  "Action Board",
  "Scenarios",
  "Advisor Map",
  "Advisor Briefs",
  "Readiness",
  "Data Room",
  "Guardrails",
  "Timeline",
  "Meeting Copilot",
  "Meeting Prep",
  "Follow-Up",
  "Items to Clarify",
  "Presentation",
] as const;

type Tab = (typeof TABS)[number];

interface AdminAiStrategySectionProps {
  leadId: string;
  strategyData: AdminStrategyRoomData;
  decisionData: AdminDecisionLayerData;
  internalSummary: string;
  suggestedFollowUp: string;
  concierge: LeadConcierge | null;
  tenantSlug?: string;
  onRegenerated?: () => void;
}

export function AdminAiStrategySection({
  leadId,
  strategyData,
  decisionData,
  internalSummary,
  suggestedFollowUp,
  concierge,
  tenantSlug,
  onRegenerated,
}: AdminAiStrategySectionProps) {
  const [tab, setTab] = useState<Tab>("Strategy Room");
  const [regenerating, setRegenerating] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [dataRoomItems, setDataRoomItems] = useState<DataRoomItem[]>(
    decisionData.dataRoomItems
  );

  const hasData = Boolean(strategyData.strategyRoom);

  useEffect(() => {
    if (!hasData) return;
    void adminFetch(`/api/leads/${leadId}/data-room`)
      .then((res) => res.json())
      .then((json: { items: DataRoomItem[] }) => setDataRoomItems(json.items));
  }, [hasData, leadId, strategyData.aiGeneratedAt]);

  const dataRoomMetrics = calculateDataRoomCompletion(dataRoomItems);
  const missingCount =
    strategyData.itemsToClarify?.missingInformation.length ?? 0;

  const regenerate = async () => {
    setRegenerating(true);
    try {
      await adminFetch(`/api/leads/${leadId}/regenerate-ai`, {
        method: "POST",
      });
      onRegenerated?.();
    } finally {
      setRegenerating(false);
    }
  };

  if (!hasData) {
    return (
      <div className="mb-6 rounded-2xl border border-dashed border-champagne/40 bg-beige/20 p-6 text-center">
        <p className="mb-3 text-sm text-gray-600">
          AI Strategy Room not yet generated for this lead.
        </p>
        <Button size="sm" disabled={regenerating} onClick={regenerate}>
          {regenerating ? "Generating…" : "Generate AI Demo Layer"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg text-navy">AI Private Client Intelligence</h3>
          {strategyData.aiGenerationSource && (
            <p className="text-xs text-gray-400">
              Source: {strategyData.aiGenerationSource}
              {strategyData.aiGenerationModel
                ? ` · ${strategyData.aiGenerationModel}`
                : ""}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <PresentBriefButton leadId={leadId} tenantSlug={tenantSlug} />
          <Button
            size="sm"
            variant="secondary"
            disabled={regenerating}
            onClick={regenerate}
          >
            {regenerating ? "Regenerating…" : "Regenerate AI"}
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <StatusCard
          label="Decision Stage"
          value={(decisionData.decisionStage ?? "exploration").replace(/_/g, " ")}
        />
        <StatusCard
          label="Readiness Score"
          value={
            strategyData.dealReadiness
              ? `${strategyData.dealReadiness.readinessScore} · ${READINESS_LABEL_DISPLAY[strategyData.dealReadiness.readinessLabel]}`
              : "—"
          }
        />
        <StatusCard
          label="Guardrails"
          value={decisionData.complianceGuardrails?.overallStatus ?? "pending"}
        />
        <StatusCard
          label="Data Room"
          value={
            dataRoomMetrics.totalItems > 0
              ? `${dataRoomMetrics.completionPercent}% · ${dataRoomMetrics.reviewedCount + dataRoomMetrics.notNeededCount}/${dataRoomMetrics.totalItems} reviewed`
              : "—"
          }
        />
        <StatusCard label="Missing Info" value={String(missingCount)} />
        <StatusCard
          label="Next Best Action"
          value={
            strategyData.dealReadiness?.nextBestAction?.slice(0, 48) ?? "—"
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-gray-100 pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t
                ? "bg-navy text-white"
                : "text-gray-500 hover:bg-beige/50 hover:text-navy"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {tab === "Strategy Room" && strategyData.strategyRoom && (
          <StrategyRoomCard data={strategyData.strategyRoom} />
        )}
        {tab === "Decision Graph" && (
          <DecisionGraphPanel
            data={decisionData.decisionGraph}
            mode="admin"
            leadId={leadId}
            primaryCoordinationNeed={
              strategyData.strategyRoom?.primaryCoordinationNeed
            }
          />
        )}
        {tab === "Action Board" && (
          <AdvisorActionBoardAdmin
            leadId={leadId}
            initialBoard={decisionData.advisorActionBoard}
            stale={decisionData.advisorActionBoardStale}
            onRegenerated={onRegenerated}
          />
        )}
        {tab === "Scenarios" && strategyData.scenarioComparison && (
          <ScenarioComparisonPanel data={strategyData.scenarioComparison} />
        )}
        {tab === "Advisor Map" && strategyData.advisorCoordinationMap && (
          <AdvisorCoordinationMapPanel
            data={strategyData.advisorCoordinationMap}
          />
        )}
        {tab === "Advisor Briefs" && (
          <AdvisorBriefsPanel
            leadId={leadId}
            briefs={strategyData.advisorSpecificBriefs}
          />
        )}
        {tab === "Readiness" && strategyData.dealReadiness && (
          <DealReadinessScore data={strategyData.dealReadiness} />
        )}
        {tab === "Data Room" && (
          <DataRoomChecklist leadId={leadId} admin />
        )}
        {tab === "Guardrails" && (
          <ComplianceGuardrailsPanel
            leadId={leadId}
            initialData={decisionData.complianceGuardrails}
          />
        )}
        {tab === "Timeline" && <DecisionTimeline leadId={leadId} />}
        {tab === "Meeting Copilot" && <MeetingCopilot leadId={leadId} />}
        {tab === "Meeting Prep" && strategyData.meetingPrepPack && (
          <div onFocus={() => trackMeetingPrepViewed({ lead_id: leadId })}>
            <MeetingPrepPackPanel
              data={strategyData.meetingPrepPack}
              onCopy={() => trackFollowupCopied({ field: "meeting_prep" })}
            />
          </div>
        )}
        {tab === "Follow-Up" && strategyData.whiteGloveFollowUp && (
          <WhiteGloveFollowUpPanel
            data={strategyData.whiteGloveFollowUp}
            onCopy={(field) => trackFollowupCopied({ field })}
          />
        )}
        {tab === "Items to Clarify" && strategyData.itemsToClarify && (
          <MissingInfoPanel data={strategyData.itemsToClarify} />
        )}
        {tab === "Presentation" && strategyData.presentationMode && (
          <div className="space-y-4">
            <Button onClick={() => setShowPresentation(true)}>
              Open Presentation Preview
            </Button>
            {showPresentation && (
              <PresentationModeViewer
                data={strategyData.presentationMode}
                showSpeakerNotes
                onClose={() => setShowPresentation(false)}
              />
            )}
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4 border-t border-gray-100 pt-4">
        <div className="rounded-xl bg-beige/30 p-4 text-sm">
          <p className="mb-1 font-medium text-navy">Internal Lead Summary</p>
          <p className="text-gray-600">{internalSummary}</p>
        </div>
        <div className="rounded-xl bg-champagne/10 p-4 text-sm">
          <p className="mb-1 font-medium text-navy">Suggested Follow-Up</p>
          <p className="text-gray-600">{suggestedFollowUp}</p>
        </div>
        {concierge && <AdminLeadConciergeSection concierge={concierge} />}
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-beige/20 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-medium capitalize text-navy">
        {value}
      </p>
    </div>
  );
}
