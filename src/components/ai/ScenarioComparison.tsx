import { ReportCard } from "@/components/report/report-card";
import type { ScenarioComparison } from "@/lib/schemas/ai-strategy-room";

interface ScenarioComparisonProps {
  data: ScenarioComparison;
}

export function ScenarioComparisonPanel({ data }: ScenarioComparisonProps) {
  return (
    <div data-testid="scenario-comparison-section">
      <ReportCard title="Scenario Comparison">
      <p className="mb-6 text-sm text-gray-500">{data.overallScenarioNote}</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {data.scenarios.map((scenario) => (
          <div
            key={scenario.id}
            className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <h4 className="font-serif text-lg text-navy">{scenario.title}</h4>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              {scenario.description}
            </p>

            <div className="mt-4 flex-1 space-y-3 text-sm">
              <Section label="Potential Advantages" items={scenario.potentialAdvantages} />
              <Section label="Planning Risks" items={scenario.planningRisks} variant="risk" />
              <Section
                label="Advisor Reviews Needed"
                items={scenario.advisorReviewsNeeded}
              />
            </div>

            <p className="mt-4 border-t border-gray-100 pt-3 text-xs italic text-gray-500">
              {scenario.nonAdviceSummary}
            </p>
          </div>
        ))}
      </div>
    </ReportCard>
    </div>
  );
}

function Section({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant?: "risk";
}) {
  return (
    <div>
      <p
        className={`mb-1 text-xs font-medium uppercase tracking-wide ${
          variant === "risk" ? "text-gray-400" : "text-champagne"
        }`}
      >
        {label}
      </p>
      <ul className="list-disc space-y-0.5 pl-4 text-gray-600">
        {items.slice(0, 3).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ScenarioComparisonSkeleton() {
  return (
    <ReportCard title="Scenario Comparison">
      <div className="grid animate-pulse gap-4 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-64 rounded-xl bg-gray-100" />
        ))}
      </div>
    </ReportCard>
  );
}
