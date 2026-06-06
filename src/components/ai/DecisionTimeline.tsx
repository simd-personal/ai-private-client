"use client";

import { useEffect, useState } from "react";
import { ReportCard } from "@/components/report/report-card";
import { adminFetch } from "@/lib/admin/admin-fetch";
import { trackDecisionTimelineViewed } from "@/lib/analytics";
import type { DecisionVersion } from "@/lib/schemas/decision-layer";

interface DecisionTimelineProps {
  leadId: string;
}

export function DecisionTimeline({ leadId }: DecisionTimelineProps) {
  const [versions, setVersions] = useState<DecisionVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await adminFetch(
          `/api/leads/${leadId}/decision-timeline`
        );
        const json = (await res.json()) as { versions: DecisionVersion[] };
        setVersions(json.versions);
        trackDecisionTimelineViewed({ lead_id: leadId });
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-xl border border-gray-100 p-6">
        <div className="h-4 w-1/4 rounded bg-gray-100" />
        <div className="mt-4 h-16 rounded bg-gray-50" />
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <ReportCard title="Decision Timeline">
        <p className="text-sm text-gray-500">No decision versions recorded yet.</p>
      </ReportCard>
    );
  }

  return (
    <ReportCard title="Decision Timeline">
      <ol className="relative space-y-6 border-l border-champagne/40 pl-6" data-testid="decision-timeline">
        {versions.map((v) => (
          <li key={v.id} className="relative">
            <span className="absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full border-2 border-champagne bg-white" />
            <p className="text-xs font-medium uppercase tracking-wide text-champagne">
              v{v.version_number} · {v.change_source.replace(/_/g, " ")}
            </p>
            <p className="text-xs text-gray-400">
              {new Date(v.created_at).toLocaleString()}
            </p>
            {v.ai_change_summary && (
              <>
                <p className="mt-2 text-sm text-navy">
                  {v.ai_change_summary.summary}
                </p>
                {v.ai_change_summary.implications.length > 0 && (
                  <ul className="mt-2 list-disc pl-4 text-xs text-gray-600">
                    {v.ai_change_summary.implications.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
                {v.ai_change_summary.newNextSteps.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    Next: {v.ai_change_summary.newNextSteps.join(" · ")}
                  </p>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </ReportCard>
  );
}
