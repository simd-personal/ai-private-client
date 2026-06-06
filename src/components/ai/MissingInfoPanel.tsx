import { ReportCard } from "@/components/report/report-card";
import type { RedFlagsAndMissingInfo } from "@/lib/schemas/ai-strategy-room";

interface MissingInfoPanelProps {
  data: RedFlagsAndMissingInfo;
  title?: string;
}

export function MissingInfoPanel({
  data,
  title = "Items to Clarify",
}: MissingInfoPanelProps) {
  return (
    <ReportCard title={title}>
      <div className="mb-4 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4">
        <p className="font-medium text-navy">{data.riskLanguage.label}</p>
        <p className="mt-1 text-sm text-gray-600">
          {data.riskLanguage.explanation}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FlagList title="Missing Information" items={data.missingInformation} />
        <FlagList title="Planning Flags" items={data.planningFlags} />
        <FlagList title="Complexity Flags" items={data.complexityFlags} />
        <FlagList
          title="Before Execution"
          items={data.itemsToClarifyBeforeExecution}
        />
      </div>
    </ReportCard>
  );
}

function FlagList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-navy">{title}</p>
      <ul className="list-disc space-y-1 pl-4 text-sm text-gray-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function MissingInfoSkeleton() {
  return (
    <ReportCard title="Items to Clarify">
      <div className="h-32 animate-pulse rounded-xl bg-gray-100" />
    </ReportCard>
  );
}
