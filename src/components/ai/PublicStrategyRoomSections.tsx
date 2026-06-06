"use client";

import { useEffect, useRef } from "react";
import { AdvisorActionBoardPublic } from "@/components/ai/AdvisorActionBoard";
import { AdvisorCoordinationMapPanel } from "@/components/ai/AdvisorCoordinationMap";
import { DataRoomChecklist } from "@/components/ai/DataRoomChecklist";
import { DecisionGraphPanel } from "@/components/ai/DecisionGraph";
import { MissingInfoPanel } from "@/components/ai/MissingInfoPanel";
import { ScenarioComparisonPanel } from "@/components/ai/ScenarioComparison";
import {
  StrategyRoomCard,
  StrategyRoomSkeleton,
} from "@/components/ai/StrategyRoomCard";
import { ReportCard } from "@/components/report/report-card";
import {
  trackAdvisorMapViewed,
  trackScenarioComparisonViewed,
  trackStrategyRoomViewed,
} from "@/lib/analytics";
import type { PublicStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import type { PublicDecisionLayerData } from "@/lib/schemas/decision-layer";

interface PublicStrategyRoomSectionsProps {
  data: PublicStrategyRoomData | null;
  decisionLayer?: PublicDecisionLayerData | null;
  recommendedNextStep?: string;
  loading?: boolean;
}

export function PublicStrategyRoomSections({
  data,
  decisionLayer,
  recommendedNextStep,
  loading,
}: PublicStrategyRoomSectionsProps) {
  const strategyRef = useRef<HTMLDivElement>(null);
  const scenarioRef = useRef<HTMLDivElement>(null);
  const advisorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.strategyRoom) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          if (entry.target === strategyRef.current) trackStrategyRoomViewed();
          if (entry.target === scenarioRef.current)
            trackScenarioComparisonViewed();
          if (entry.target === advisorRef.current) trackAdvisorMapViewed();
        });
      },
      { threshold: 0.3 }
    );

    [strategyRef, scenarioRef, advisorRef].forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <StrategyRoomSkeleton />
      </div>
    );
  }

  if (!data?.strategyRoom) return null;

  return (
    <div className="space-y-6">
      <ReportCard title="Executive Summary">
        <p className="leading-relaxed text-gray-700">
          {data.strategyRoom.situationSnapshot}
        </p>
      </ReportCard>

      <div ref={strategyRef} data-testid="strategy-room-section">
        <StrategyRoomCard data={data.strategyRoom} />
      </div>

      {data.scenarioComparison && (
        <div ref={scenarioRef}>
          <ScenarioComparisonPanel data={data.scenarioComparison} />
        </div>
      )}

      {data.advisorCoordinationMap && (
        <div ref={advisorRef}>
          <AdvisorCoordinationMapPanel data={data.advisorCoordinationMap} />
        </div>
      )}

      {decisionLayer?.decisionGraph ? (
        <DecisionGraphPanel
          data={decisionLayer.decisionGraph}
          mode="public"
          primaryCoordinationNeed={data.strategyRoom.primaryCoordinationNeed}
        />
      ) : (
        <DecisionGraphPanel data={null} mode="public" />
      )}

      {decisionLayer?.advisorActionBoard && (
        <AdvisorActionBoardPublic board={decisionLayer.advisorActionBoard} />
      )}

      {decisionLayer && decisionLayer.dataRoomItems.length > 0 && (
        <DataRoomChecklist
          leadId=""
          publicItems={decisionLayer.dataRoomItems}
        />
      )}

      {data.itemsToClarify && (
        <MissingInfoPanel data={data.itemsToClarify} title="Items to Clarify" />
      )}

      {recommendedNextStep && (
        <ReportCard title="Recommended Next Step">
          <p className="leading-relaxed text-gray-700">{recommendedNextStep}</p>
        </ReportCard>
      )}
    </div>
  );
}
