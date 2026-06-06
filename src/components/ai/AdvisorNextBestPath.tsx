"use client";

import { ReportCard } from "@/components/report/report-card";
import { getAdvisorRoleLabel } from "@/lib/schemas/advisor-action-board";
import type {
  AdvisorNextBestPathStep,
  PublicAdvisorNextBestPathStep,
} from "@/lib/schemas/advisor-action-board";

type Step = AdvisorNextBestPathStep | PublicAdvisorNextBestPathStep;

interface AdvisorNextBestPathProps {
  steps: Step[];
  admin?: boolean;
}

export function AdvisorNextBestPath({ steps, admin = false }: AdvisorNextBestPathProps) {
  if (steps.length === 0) return null;

  return (
    <ReportCard title={admin ? "Next Best Path" : "Suggested Next Steps"}>
      <ol className="space-y-3">
        {steps.map((step) => (
          <li
            key={step.stepNumber}
            className="rounded-xl border border-gray-100 bg-beige/20 p-4"
          >
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-medium text-white">
                {step.stepNumber}
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-champagne">
                {getAdvisorRoleLabel(step.ownerRole)}
              </span>
            </div>
            <p className="font-medium text-navy">{step.title}</p>
            <p className="mt-1 text-sm text-gray-600">
              {admin ? step.reason : step.clientSafeLanguage}
            </p>
            {admin && "adminOnlyNote" in step && step.adminOnlyNote ? (
              <p className="mt-2 text-xs text-gray-400">{step.adminOnlyNote}</p>
            ) : null}
          </li>
        ))}
      </ol>
    </ReportCard>
  );
}
