import { AdvisorPill } from "@/components/ai/AdvisorPill";
import { ReportCard } from "@/components/report/report-card";
import type { AdvisorCoordinationMap } from "@/lib/schemas/ai-strategy-room";

interface AdvisorCoordinationMapProps {
  data: AdvisorCoordinationMap;
}

export function AdvisorCoordinationMapPanel({
  data,
}: AdvisorCoordinationMapProps) {
  return (
    <ReportCard title="Advisor Coordination Map">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {data.advisors.map((advisor) => (
            <div
              key={`${advisor.advisorType}-${advisor.displayName}`}
              className="rounded-xl border border-gray-100 bg-beige/20 p-4"
            >
              <AdvisorPill
                advisorType={advisor.advisorType}
                urgency={advisor.urgency}
              />
              <p className="mt-2 text-sm font-medium text-navy">
                {advisor.roleInDecision}
              </p>
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Planning Topics for Review
                </p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm text-gray-600">
                  {advisor.topicsToReview.map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h4 className="mb-3 font-medium text-navy">Coordination Sequence</h4>
          <ol className="space-y-2">
            {data.coordinationSequence.map((step, i) => (
              <li
                key={step}
                className="flex items-start gap-3 rounded-lg bg-white p-3 text-sm"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy text-xs font-medium text-white">
                  {i + 1}
                </span>
                <span className="text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-champagne/30 bg-champagne/5 p-4">
          <p className="text-sm font-medium text-navy">
            Recommended First Conversation
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {data.recommendedFirstConversation}
          </p>
        </div>
      </div>
    </ReportCard>
  );
}

export function AdvisorCoordinationMapSkeleton() {
  return (
    <ReportCard title="Advisor Coordination Map">
      <div className="animate-pulse space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </ReportCard>
  );
}
