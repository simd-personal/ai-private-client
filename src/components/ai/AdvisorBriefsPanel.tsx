"use client";

import { useState } from "react";
import { AdvisorPill } from "@/components/ai/AdvisorPill";
import { CopyBlock } from "@/components/ai/CopyBlock";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  ADVISOR_TYPES,
  getAdvisorBriefByType,
  type AdvisorBrief,
  type AdvisorSpecificBriefs,
  type AdvisorType,
} from "@/lib/schemas/ai-strategy-room";

interface AdvisorBriefsPanelProps {
  leadId: string;
  briefs: AdvisorSpecificBriefs | null;
  onBriefGenerated?: () => void;
}

export function AdvisorBriefsPanel({
  leadId,
  briefs,
  onBriefGenerated,
}: AdvisorBriefsPanelProps) {
  const [selected, setSelected] = useState<AdvisorType>("real_estate_agent");
  const [loading, setLoading] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<AdvisorBrief | null>(
    null
  );

  const currentBrief =
    generatedBrief ?? (briefs ? getAdvisorBriefByType(briefs, selected) : null);

  const regenerateBrief = async () => {
    setLoading(true);
    try {
      const res = await adminFetch(`/api/leads/${leadId}/advisor-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisorType: selected }),
      });
      const data = (await res.json()) as { brief: AdvisorBrief };
      setGeneratedBrief(data.brief);
      onBriefGenerated?.();
    } finally {
      setLoading(false);
    }
  };

  if (!briefs && !generatedBrief) {
    return (
      <ReportCard title="Advisor Briefs">
        <p className="text-sm text-gray-500">
          Advisor briefs will appear after AI generation completes.
        </p>
      </ReportCard>
    );
  }

  return (
    <ReportCard title="Advisor Briefs">
      <div className="mb-4 flex flex-wrap gap-2">
        {ADVISOR_TYPES.filter((t) => t !== "other").map((type) => (
          <Button
            key={type}
            size="sm"
            variant={selected === type ? "default" : "secondary"}
            onClick={() => {
              setSelected(type);
              setGeneratedBrief(null);
            }}
          >
            <AdvisorPill advisorType={type} />
          </Button>
        ))}
      </div>

      {currentBrief && (
        <div className="space-y-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <h4 className="font-serif text-lg text-navy">{currentBrief.headline}</h4>
            <CopyBlock
              text={formatBriefForCopy(currentBrief)}
              label="Copy Brief"
            />
          </div>
          <p className="text-gray-600">{currentBrief.contextSummary}</p>
          <ListBlock title="Planning Topics" items={currentBrief.planningTopics} />
          <ListBlock title="Questions to Ask" items={currentBrief.questionsToAsk} />
          <ListBlock
            title="Documents to Request"
            items={currentBrief.documentsToRequest}
          />
          <p className="rounded-lg bg-beige/30 p-3 text-gray-600">
            {currentBrief.coordinationNotes}
          </p>
          <p className="text-xs italic text-gray-400">
            {currentBrief.nonAdviceDisclaimer}
          </p>
        </div>
      )}

      <Button
        size="sm"
        variant="secondary"
        className="mt-4"
        disabled={loading}
        onClick={regenerateBrief}
      >
        {loading ? "Generating…" : "Regenerate Brief"}
      </Button>
    </ReportCard>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 font-medium text-navy">{title}</p>
      <ul className="list-disc space-y-0.5 pl-4 text-gray-600">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function formatBriefForCopy(brief: AdvisorBrief): string {
  return [
    brief.headline,
    "",
    brief.contextSummary,
    "",
    "Planning Topics:",
    ...brief.planningTopics.map((t) => `- ${t}`),
    "",
    "Questions to Ask:",
    ...brief.questionsToAsk.map((q) => `- ${q}`),
    "",
    brief.nonAdviceDisclaimer,
  ].join("\n");
}
