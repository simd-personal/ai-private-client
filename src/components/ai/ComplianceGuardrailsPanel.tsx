"use client";

import { useEffect, useState } from "react";
import { ReportCard } from "@/components/report/report-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminFetch } from "@/lib/admin/admin-fetch";
import {
  trackGuardrailsRechecked,
  trackGuardrailsViewed,
} from "@/lib/analytics";
import type { ComplianceGuardrails } from "@/lib/schemas/decision-layer";

interface ComplianceGuardrailsPanelProps {
  leadId: string;
  initialData?: ComplianceGuardrails | null;
}

const STATUS_STYLES = {
  passed: "bg-green-50 text-green-800 border-green-200",
  needs_review: "bg-amber-50 text-amber-800 border-amber-200",
  blocked: "bg-red-50 text-red-800 border-red-200",
};

export function ComplianceGuardrailsPanel({
  leadId,
  initialData,
}: ComplianceGuardrailsPanelProps) {
  const [data, setData] = useState<ComplianceGuardrails | null>(
    initialData ?? null
  );
  const [rechecking, setRechecking] = useState(false);

  useEffect(() => {
    trackGuardrailsViewed({ lead_id: leadId });
  }, [leadId]);

  const recheck = async () => {
    setRechecking(true);
    try {
      const res = await adminFetch(`/api/leads/${leadId}/compliance`, {
        method: "POST",
      });
      const json = (await res.json()) as { guardrails: ComplianceGuardrails };
      setData(json.guardrails);
      trackGuardrailsRechecked({ lead_id: leadId });
    } finally {
      setRechecking(false);
    }
  };

  if (!data) {
    return (
      <ReportCard title="Guardrails Review">
        <p className="mb-3 text-sm text-gray-500">
          Compliance guardrails will appear after AI generation.
        </p>
        <Button size="sm" onClick={recheck} disabled={rechecking}>
          Run guardrails check
        </Button>
      </ReportCard>
    );
  }

  return (
    <div className="space-y-4">
      <ReportCard title="Guardrails Review">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Badge
            className={`border ${STATUS_STYLES[data.overallStatus]}`}
          >
            {data.overallStatus.replace(/_/g, " ")}
          </Badge>
          <span className="text-xs text-gray-400">
            Checked {new Date(data.checkedAt).toLocaleString()}
          </span>
          <Button size="sm" variant="secondary" onClick={recheck} disabled={rechecking}>
            {rechecking ? "Rechecking…" : "Recheck"}
          </Button>
        </div>

        <div className="space-y-2">
          {data.checks.map((check) => (
            <div
              key={check.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
            >
              <div>
                <p className="text-sm font-medium text-navy">{check.label}</p>
                <p className="text-xs text-gray-500">{check.explanation}</p>
              </div>
              <Badge variant="outline">{check.status}</Badge>
            </div>
          ))}
        </div>
      </ReportCard>

      {data.blockedPhrasesFound.length > 0 && (
        <ReportCard title="Flagged phrasing">
          <div className="space-y-2">
            {data.blockedPhrasesFound.map((p) => (
              <div key={p.phrase} className="rounded-lg bg-amber-50/50 p-3 text-sm">
                <p className="font-medium text-navy">&ldquo;{p.phrase}&rdquo;</p>
                <p className="text-xs text-gray-500">{p.category}</p>
                <p className="mt-1 text-xs text-gray-600">
                  Suggest: {p.replacementSuggestion}
                </p>
              </div>
            ))}
          </div>
        </ReportCard>
      )}

      <ReportCard title="Public disclosure preview">
        <p className="text-sm text-gray-600">{data.publicDisclosure.briefDisclaimer}</p>
        <p className="mt-2 text-xs text-gray-500">
          {data.publicDisclosure.advisorReviewDisclosure}
        </p>
      </ReportCard>
    </div>
  );
}
