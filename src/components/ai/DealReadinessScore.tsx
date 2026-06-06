import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import {
  READINESS_LABEL_DISPLAY,
  type DealReadiness,
} from "@/lib/schemas/ai-strategy-room";

interface DealReadinessScoreProps {
  data: DealReadiness;
}

const BREAKDOWN_LABELS: Record<
  keyof DealReadiness["scoreBreakdown"],
  string
> = {
  objectiveClarity: "Objective Clarity",
  timelineClarity: "Timeline Clarity",
  financialContext: "Financial Context",
  advisorInvolvement: "Advisor Involvement",
  privacyComplexity: "Privacy Complexity",
  executionComplexity: "Execution Complexity",
};

export function DealReadinessScore({ data }: DealReadinessScoreProps) {
  const scoreColor =
    data.readinessScore >= 75
      ? "text-emerald-700"
      : data.readinessScore >= 55
        ? "text-amber-700"
        : "text-gray-600";

  return (
    <ReportCard title="Readiness Intelligence">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center rounded-2xl border border-gray-100 bg-gradient-to-br from-navy to-navy-light p-8 text-white lg:w-48">
          <span className="text-xs uppercase tracking-widest text-champagne">
            Score
          </span>
          <span className={`font-serif text-5xl ${scoreColor}`}>
            {data.readinessScore}
          </span>
          <Badge variant="champagne" className="mt-2">
            {READINESS_LABEL_DISPLAY[data.readinessLabel]}
          </Badge>
        </div>

        <div className="flex-1 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(data.scoreBreakdown).map(([key, value]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-gray-500">
                    {BREAKDOWN_LABELS[key as keyof DealReadiness["scoreBreakdown"]]}
                  </span>
                  <span className="font-medium text-navy">{value}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-champagne transition-all"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-beige/30 p-4 text-sm">
            <p className="font-medium text-navy">{data.priorityReason}</p>
            <p className="mt-2 text-gray-600">{data.nextBestAction}</p>
          </div>
        </div>
      </div>
    </ReportCard>
  );
}
