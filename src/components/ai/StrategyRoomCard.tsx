import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import type { StrategyRoom } from "@/lib/schemas/ai-strategy-room";

interface StrategyRoomCardProps {
  data: StrategyRoom;
  compact?: boolean;
}

const COMPLEXITY_LABELS: Record<StrategyRoom["complexityLevel"], string> = {
  low: "Low Complexity",
  medium: "Moderate Complexity",
  high: "High Complexity",
  very_high: "Very High Complexity",
};

export function StrategyRoomCard({ data, compact = false }: StrategyRoomCardProps) {
  return (
    <ReportCard title="Private Strategy Room">
      <div className="space-y-6">
        <div>
          <Badge variant="champagne" className="mb-3">
            {COMPLEXITY_LABELS[data.complexityLevel]}
          </Badge>
          {!compact ? (
            <p className="leading-relaxed text-gray-700">{data.situationSnapshot}</p>
          ) : null}
        </div>

        {!compact ? (
          <>
            <div>
              <h4 className="mb-2 font-medium text-navy">Known Facts</h4>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600">
                {data.knownFacts.map((fact) => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-2 font-medium text-navy">Items to Verify</h4>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600">
                {data.itemsToVerify.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </>
        ) : null}

        <div>
          <h4 className="mb-2 font-medium text-navy">Key Decision Drivers</h4>
          <div className="flex flex-wrap gap-2">
            {data.keyDecisionDrivers.map((driver) => (
              <Badge key={driver} variant="warm" className="font-normal">
                {driver}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-champagne/30 bg-beige/20 p-4">
          <p className="text-sm font-medium text-navy">Primary Coordination Need</p>
          <p className="mt-1 text-sm text-gray-600">{data.primaryCoordinationNeed}</p>
        </div>
      </div>
    </ReportCard>
  );
}

export function StrategyRoomSkeleton() {
  return (
    <ReportCard title="Private Strategy Room">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="h-20 rounded bg-gray-100" />
        <div className="h-16 rounded bg-gray-100" />
        <div className="h-16 rounded bg-gray-100" />
      </div>
    </ReportCard>
  );
}
