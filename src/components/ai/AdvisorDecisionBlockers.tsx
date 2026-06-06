"use client";

import { ReportCard } from "@/components/report/report-card";
import { Badge } from "@/components/ui/badge";
import { getAdvisorRoleLabel } from "@/lib/schemas/advisor-action-board";
import type { AdvisorDecisionBlocker } from "@/lib/schemas/advisor-action-board";

interface AdvisorDecisionBlockersProps {
  blockers: AdvisorDecisionBlocker[];
}

export function AdvisorDecisionBlockers({ blockers }: AdvisorDecisionBlockersProps) {
  if (blockers.length === 0) return null;

  return (
    <ReportCard title="Decision Blockers">
      <div className="space-y-3">
        {blockers.map((blocker) => (
          <div
            key={blocker.id}
            className="rounded-xl border border-gray-100 bg-white p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  blocker.severity === "high"
                    ? "hot"
                    : blocker.severity === "medium"
                      ? "champagne"
                      : "outline"
                }
              >
                {blocker.severity}
              </Badge>
              <span className="text-xs text-gray-400">{blocker.blockedArea}</span>
              <span className="text-xs font-medium text-navy">
                {getAdvisorRoleLabel(blocker.ownerRole)}
              </span>
            </div>
            <p className="font-medium text-navy">{blocker.blocker}</p>
            <p className="mt-1 text-sm text-gray-600">{blocker.whyItMatters}</p>
            <p className="mt-2 text-sm text-gray-700">
              <span className="font-medium">Suggested resolution: </span>
              {blocker.suggestedResolution}
            </p>
            <p className="mt-2 rounded-lg bg-beige/30 p-2 text-xs text-gray-500">
              {blocker.adminOnlyNote}
            </p>
          </div>
        ))}
      </div>
    </ReportCard>
  );
}
