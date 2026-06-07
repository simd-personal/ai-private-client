"use client";

import { useEffect, useRef, useState } from "react";
import { DecisionGraphLegend } from "@/components/ai/DecisionGraphLegend";
import { DecisionGraphNodeList } from "@/components/ai/DecisionGraphNode";
import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackDecisionGraphViewed } from "@/lib/analytics";
import {
  DECISION_MAP_STAGE_LABELS,
  groupDecisionMapNodes,
  NODE_STATUS_LABELS,
  sanitizePublicDecisionText,
  type DecisionMapNode,
} from "@/lib/decision/decision-map-utils";
import type {
  DecisionGraph,
  PublicDecisionGraph,
} from "@/lib/schemas/decision-layer";

type DecisionGraphMode = "public" | "admin";
type DecisionGraphVariant = "executive" | "technical";

type DecisionGraphProps = {
  data: DecisionGraph | PublicDecisionGraph | null;
  mode?: DecisionGraphMode;
  variant?: DecisionGraphVariant;
  admin?: boolean;
  leadId?: string;
  primaryCoordinationNeed?: string;
};

export function DecisionGraphPanel({
  data,
  mode,
  variant = "executive",
  admin: adminProp,
  leadId,
  primaryCoordinationNeed,
}: DecisionGraphProps) {
  const resolvedMode: DecisionGraphMode =
    mode ?? (adminProp ? "admin" : "public");
  const isAdmin = resolvedMode === "admin";
  const ref = useRef<HTMLDivElement>(null);
  const [showTechnical, setShowTechnical] = useState(
    variant === "technical" && isAdmin
  );

  useEffect(() => {
    if (!ref.current || !data) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackDecisionGraphViewed({
            lead_id: leadId,
            admin: isAdmin ? 1 : 0,
          });
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [isAdmin, leadId, data]);

  if (!data) {
    return <DecisionMapFallback />;
  }

  const displayText = (text: string) =>
    isAdmin ? text : sanitizePublicDecisionText(text);

  const columns = groupDecisionMapNodes(data.nodes, isAdmin);
  const hasContent =
    data.nodes.length > 0 ||
    data.nextBestPath.length > 0 ||
    Boolean(data.clientSafeSummary);

  if (!hasContent) {
    return <DecisionMapFallback />;
  }

  return (
    <div ref={ref} className="space-y-6" data-testid="decision-map-section">
      <ExecutiveDecisionMapHeader
        data={data}
        isAdmin={isAdmin}
        displayText={displayText}
        primaryCoordinationNeed={primaryCoordinationNeed}
      />

      {variant === "executive" || !showTechnical ? (
        <>
          {isAdmin ? (
            <ExecutiveSummaryCard
              data={data}
              isAdmin={isAdmin}
              displayText={displayText}
              primaryCoordinationNeed={primaryCoordinationNeed}
            />
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DecisionMapColumn
              title="Known Facts"
              subtitle="Confirmed context for planning"
              nodes={columns.knownFacts}
              isAdmin={isAdmin}
              showConnector
            />
            <DecisionMapColumn
              title="Items to Verify"
              subtitle="Information still to confirm"
              nodes={columns.itemsToVerify}
              isAdmin={isAdmin}
              showConnector
            />
            <DecisionMapColumn
              title="Advisor Review"
              subtitle="Specialist coordination topics"
              nodes={columns.advisorReview}
              isAdmin={isAdmin}
              showConnector
            />
            <DecisionMapColumn
              title="Next Actions"
              subtitle="Suggested coordination steps"
              nodes={columns.nextActions}
              isAdmin={isAdmin}
            />
          </div>

          {data.nextBestPath.length > 0 && (
            <ExecutiveNextBestPathFlow
              steps={data.nextBestPath}
              isAdmin={isAdmin}
              displayText={displayText}
            />
          )}
        </>
      ) : null}

      {isAdmin && (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={showTechnical ? "default" : "secondary"}
            onClick={() => setShowTechnical((value) => !value)}
          >
            {showTechnical ? "Hide technical graph view" : "Technical graph view"}
          </Button>
        </div>
      )}

      {isAdmin && showTechnical && (
        <DecisionGraphTechnicalView data={data as DecisionGraph} />
      )}

      {isAdmin && <DecisionGraphAdminDetails data={data as DecisionGraph} />}
    </div>
  );
}

function DecisionMapFallback() {
  return (
    <div className="rounded-2xl border border-champagne/30 bg-gradient-to-br from-beige/40 to-white p-8 text-center shadow-sm">
      <p className="font-serif text-xl text-navy">Decision Map</p>
      <p className="mt-3 text-sm leading-relaxed text-gray-600">
        Decision Map will appear once the private brief is generated.
      </p>
    </div>
  );
}

function ExecutiveDecisionMapHeader({
  data,
  isAdmin,
  displayText,
  primaryCoordinationNeed,
}: {
  data: DecisionGraph | PublicDecisionGraph;
  isAdmin: boolean;
  displayText: (text: string) => string;
  primaryCoordinationNeed?: string;
}) {
  return (
    <div className="rounded-2xl border border-champagne/25 bg-gradient-to-br from-beige/50 via-white to-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne">
            Decision Map
          </p>
          <h3 className="mt-1 font-serif text-2xl text-navy">
            {data.graphTitle || "Private Client Decision Map"}
          </h3>
          {!isAdmin ? (
            <p className="mt-1 text-sm text-gray-500">Private Client Decision Map</p>
          ) : null}
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-600">
            {displayText(data.centralDecision)}
          </p>
        </div>
        <Badge variant="champagne" className="shrink-0 normal-case">
          {DECISION_MAP_STAGE_LABELS[data.decisionStage]}
        </Badge>
      </div>
      {primaryCoordinationNeed ? (
        <p className="mt-4 border-t border-champagne/20 pt-4 text-sm text-gray-700">
          <span className="font-medium text-navy">Primary coordination need: </span>
          {displayText(primaryCoordinationNeed)}
        </p>
      ) : null}
    </div>
  );
}

function ExecutiveSummaryCard({
  data,
  isAdmin,
  displayText,
  primaryCoordinationNeed,
}: {
  data: DecisionGraph | PublicDecisionGraph;
  isAdmin: boolean;
  displayText: (text: string) => string;
  primaryCoordinationNeed?: string;
}) {
  return (
    <ReportCard title="Executive Summary">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryField label="Central decision" value={displayText(data.centralDecision)} />
        <SummaryField
          label="Decision stage"
          value={DECISION_MAP_STAGE_LABELS[data.decisionStage]}
        />
        {primaryCoordinationNeed ? (
          <SummaryField
            label="Primary coordination need"
            value={displayText(primaryCoordinationNeed)}
            className="sm:col-span-2"
          />
        ) : null}
        <div className={primaryCoordinationNeed ? "sm:col-span-2" : "sm:col-span-2"}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Client-safe summary
          </p>
          <p className="mt-1 leading-relaxed text-gray-700">
            {displayText(data.clientSafeSummary)}
          </p>
        </div>
      </div>
      {isAdmin && "adminSummary" in data && data.adminSummary ? (
        <p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400">
          {data.adminSummary}
        </p>
      ) : null}
    </ReportCard>
  );
}

function SummaryField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>
      <p className="mt-1 leading-relaxed text-gray-700">{value}</p>
    </div>
  );
}

function DecisionMapColumn({
  title,
  subtitle,
  nodes,
  isAdmin,
  showConnector = false,
}: {
  title: string;
  subtitle: string;
  nodes: DecisionMapNode[];
  isAdmin: boolean;
  showConnector?: boolean;
}) {
  return (
    <div className="relative flex flex-col">
      {showConnector ? (
        <div
          aria-hidden
          className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden h-px w-4 -translate-y-1/2 bg-champagne/60 lg:block"
        />
      ) : null}
      <div className="flex h-full flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md">
        <div className="border-b border-champagne/20 bg-beige/30 px-4 py-4">
          <h4 className="font-serif text-lg text-navy">{title}</h4>
          <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          {nodes.length === 0 ? (
            <p className="text-sm italic text-gray-400">No items identified yet.</p>
          ) : (
            nodes.map((node) => (
              <DecisionMapItemCard key={node.id} node={node} isAdmin={isAdmin} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DecisionMapItemCard({
  node,
  isAdmin,
}: {
  node: DecisionMapNode;
  isAdmin: boolean;
}) {
  const label = isAdmin ? node.label : sanitizePublicDecisionText(node.label);
  const description = isAdmin
    ? node.description
    : sanitizePublicDecisionText(node.description);

  return (
    <div className="rounded-xl border border-gray-100 bg-gradient-to-br from-white to-beige/20 p-3 transition-colors hover:border-champagne/40">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <StatusPill status={node.status} />
        {isAdmin && node.visibility === "admin" ? (
          <Badge variant="outline" className="normal-case">
            Advisor-only
          </Badge>
        ) : null}
      </div>
      <p className="font-medium leading-snug text-navy">{label}</p>
      {description && description !== label ? (
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{description}</p>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label = NODE_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
  const variant =
    status === "missing" || status === "not_started"
      ? "outline"
      : status === "needs_review"
        ? "champagne"
        : "default";

  return (
    <Badge variant={variant} className="normal-case">
      {label}
    </Badge>
  );
}

function ExecutiveNextBestPathFlow({
  steps,
  isAdmin,
  displayText,
}: {
  steps: PublicDecisionGraph["nextBestPath"] | DecisionGraph["nextBestPath"];
  isAdmin: boolean;
  displayText: (text: string) => string;
}) {
  return (
    <ReportCard title="Next Best Path">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {steps.map((step) => (
          <div
            key={step.stepNumber}
            className="flex min-w-0 flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-champagne">
              Step {step.stepNumber}
            </span>
            <p className="mt-1 font-medium leading-snug text-navy">{step.title}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
              {displayText(step.clientSafeSummary)}
            </p>
            {isAdmin ? (
              <p className="mt-2 text-xs text-gray-400">Owner: {step.owner}</p>
            ) : null}
            {isAdmin && "adminSummary" in step && step.adminSummary ? (
              <p className="mt-2 border-t border-gray-50 pt-2 text-xs text-gray-400">
                {step.adminSummary}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </ReportCard>
  );
}

function DecisionGraphAdminDetails({ data }: { data: DecisionGraph }) {
  return (
    <>
      {data.decisionBlockers.length > 0 ? (
        <ReportCard title="Decision Blockers">
          <div className="space-y-3">
            {data.decisionBlockers.map((blocker) => (
              <div
                key={blocker.blocker}
                className="rounded-xl border border-red-100/80 bg-red-50/20 p-4"
              >
                <p className="font-medium text-navy">{blocker.blocker}</p>
                <p className="mt-1 text-sm text-gray-600">{blocker.whyItMatters}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Advisor owner: {blocker.advisorOwner}
                </p>
                <p className="mt-1 text-sm text-gray-700">{blocker.suggestedNextStep}</p>
              </div>
            ))}
          </div>
        </ReportCard>
      ) : null}

      {data.edges.length > 0 ? (
        <ReportCard title="Dependencies">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">To</th>
                  <th className="px-3 py-2 font-medium">Relationship</th>
                  <th className="px-3 py-2 font-medium">Label</th>
                </tr>
              </thead>
              <tbody>
                {data.edges.map((edge) => {
                  const fromNode = data.nodes.find((node) => node.id === edge.from);
                  const toNode = data.nodes.find((node) => node.id === edge.to);
                  return (
                    <tr key={`${edge.from}-${edge.to}`} className="border-b border-gray-50">
                      <td className="px-3 py-2 text-navy">
                        {fromNode?.label ?? edge.from}
                      </td>
                      <td className="px-3 py-2 text-navy">
                        {toNode?.label ?? edge.to}
                      </td>
                      <td className="px-3 py-2 capitalize text-gray-600">
                        {edge.dependencyType.replace(/_/g, " ")}
                      </td>
                      <td className="px-3 py-2 text-gray-600">{edge.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ReportCard>
      ) : null}

      <ReportCard title="Grouped Node List">
        <DecisionGraphNodeList nodes={data.nodes} grouped />
      </ReportCard>
    </>
  );
}

function DecisionGraphTechnicalView({ data }: { data: DecisionGraph }) {
  return (
    <ReportCard title="Technical Graph View">
      <p className="mb-4 text-sm text-gray-500">
        Full node inventory with labels and relationships for advisor review.
      </p>
      <DecisionGraphLegend admin />
      <div className="mt-4">
        <DecisionGraphNodeList nodes={data.nodes} showEdges={data.edges} />
      </div>
    </ReportCard>
  );
}
