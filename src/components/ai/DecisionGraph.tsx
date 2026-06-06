"use client";

import { useEffect, useRef } from "react";
import { DecisionGraphLegend } from "@/components/ai/DecisionGraphLegend";
import { DecisionGraphNode } from "@/components/ai/DecisionGraphNode";
import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import { trackDecisionGraphViewed } from "@/lib/analytics";
import type {
  DecisionGraph,
  PublicDecisionGraph,
} from "@/lib/schemas/decision-layer";

type DecisionGraphProps =
  | {
      data: DecisionGraph;
      admin: true;
      leadId?: string;
    }
  | {
      data: PublicDecisionGraph;
      admin?: false;
      leadId?: string;
    };

const STAGE_LABELS: Record<DecisionGraph["decisionStage"], string> = {
  exploration: "Exploration",
  planning: "Planning",
  advisor_review: "Advisor review",
  execution_preparation: "Execution preparation",
};

export function DecisionGraphPanel({
  data,
  admin = false,
  leadId,
}: DecisionGraphProps) {
  const ref = useRef<HTMLDivElement>(null);
  const nodes = admin
    ? data.nodes
    : data.nodes.filter((n) => n.visibility === "public");
  const nodeIds = new Set(nodes.map((n) => n.id));
  const edges = data.edges.filter(
    (e) => nodeIds.has(e.from) && nodeIds.has(e.to)
  );
  const positions = layoutRadial(nodes);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackDecisionGraphViewed({ lead_id: leadId, admin: admin ? 1 : 0 });
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [admin, leadId]);

  return (
    <div ref={ref} className="space-y-4">
      <ReportCard title={admin ? "Decision Graph" : "Decision Map"}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STAGE_LABELS[data.decisionStage]}</Badge>
          <span className="text-sm text-gray-500">{data.graphTitle}</span>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-gray-700">
          <span className="font-medium text-navy">Central decision: </span>
          {data.centralDecision}
        </p>

        <div className="overflow-x-auto rounded-xl border border-gray-100 bg-gradient-to-br from-beige/30 to-white p-4">
          <svg viewBox="0 0 640 360" className="mx-auto w-full max-w-3xl">
            {edges.map((edge) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (!from || !to) return null;
              return (
                <g key={`${edge.from}-${edge.to}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#c9b896"
                    strokeWidth="1"
                    strokeDasharray="5 4"
                    opacity={0.55}
                  />
                </g>
              );
            })}
            {nodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              return (
                <DecisionGraphNode
                  key={node.id}
                  node={node}
                  x={pos.x}
                  y={pos.y}
                  compact={nodes.length > 12}
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-4">
          <DecisionGraphLegend admin={admin} />
        </div>

        <p className="mt-4 text-sm leading-relaxed text-gray-600">
          {data.clientSafeSummary}
        </p>
      </ReportCard>

      {data.nextBestPath.length > 0 && (
        <ReportCard title="Next Best Path">
          <ol className="space-y-3">
            {data.nextBestPath.map((step) => (
              <li key={step.stepNumber} className="rounded-lg border border-gray-100 p-3">
                <p className="text-sm font-medium text-navy">
                  {step.stepNumber}. {step.title}
                </p>
                <p className="mt-1 text-xs text-gray-500">Owner: {step.owner}</p>
                <p className="mt-2 text-sm text-gray-600">{step.clientSafeSummary}</p>
                {admin &&
                  "adminSummary" in step &&
                  step.adminSummary && (
                  <p className="mt-2 border-t border-gray-50 pt-2 text-xs text-gray-400">
                    {step.adminSummary}
                  </p>
                )}
              </li>
            ))}
          </ol>
        </ReportCard>
      )}

      {admin && "decisionBlockers" in data && data.decisionBlockers.length > 0 && (
        <ReportCard title="Decision blockers">
          <div className="space-y-3">
            {data.decisionBlockers.map((b) => (
              <div
                key={b.blocker}
                className="rounded-lg border border-red-100 bg-red-50/30 p-3"
              >
                <p className="text-sm font-medium text-navy">{b.blocker}</p>
                <p className="mt-1 text-xs text-gray-600">{b.whyItMatters}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Advisor owner: {b.advisorOwner}
                </p>
                <p className="mt-1 text-xs text-champagne-700">
                  {b.suggestedNextStep}
                </p>
              </div>
            ))}
          </div>
        </ReportCard>
      )}

      {/* Mobile fallback list */}
      <div className="space-y-2 md:hidden">
        {nodes.map((node) => (
          <div
            key={`list-${node.id}`}
            className="rounded-lg border border-gray-100 bg-white p-3 text-sm"
          >
            <p className="font-medium text-navy">{node.label}</p>
            <p className="text-xs text-gray-500">{node.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function layoutRadial(
  nodes: DecisionGraph["nodes"]
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  const center = nodes.find((n) => n.type === "objective") ?? nodes[0];
  if (!center) return map;

  map.set(center.id, { x: 320, y: 180 });
  const others = nodes.filter((n) => n.id !== center.id);
  const radius = 120;
  others.forEach((node, i) => {
    const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
    map.set(node.id, {
      x: 320 + Math.cos(angle) * radius,
      y: 180 + Math.sin(angle) * radius,
    });
  });
  return map;
}
