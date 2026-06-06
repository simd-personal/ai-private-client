"use client";

import { useEffect, useRef } from "react";
import { AdvisorCoordinationMapPanel } from "@/components/ai/AdvisorCoordinationMap";
import { MissingInfoPanel } from "@/components/ai/MissingInfoPanel";
import { RelationshipMapPanel } from "@/components/ai/RelationshipMap";
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

interface PublicStrategyRoomSectionsProps {
  data: PublicStrategyRoomData | null;
  recommendedNextStep?: string;
  loading?: boolean;
}

export function PublicStrategyRoomSections({
  data,
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

      <div ref={strategyRef}>
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

      {data.relationshipIntelligenceMap && (
        <RelationshipMapPanel data={data.relationshipIntelligenceMap} />
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
