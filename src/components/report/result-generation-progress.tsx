"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { trackResultProgressViewed } from "@/lib/analytics";

const PROGRESS_STEPS = [
  { key: "intake", label: "Intake received" },
  { key: "base_report", label: "Creating private decision profile" },
  { key: "strategy_room", label: "Preparing strategy room" },
  { key: "decision_layer", label: "Building decision map" },
  { key: "advisor_action_board", label: "Creating advisor review plan" },
  { key: "presentation", label: "Finalizing client-safe brief" },
] as const;

function stepStatus(
  stepKey: (typeof PROGRESS_STEPS)[number]["key"],
  status: PublicGenerationStatus
): "pending" | "active" | "complete" | "failed" {
  const progress = status.generationProgress;
  const completed = new Set(progress.completedStages ?? []);
  const failed = new Set(progress.failedStages ?? []);

  if (stepKey === "intake") {
    return status.generationStatus === "intake_received" ? "active" : "complete";
  }

  const stageMap: Record<string, PublicGenerationStatus["baseReportStatus"]> = {
    base_report: status.baseReportStatus,
    strategy_room: status.strategyRoomStatus,
    decision_layer: status.decisionLayerStatus,
    advisor_action_board: status.advisorActionBoardStatus,
    presentation: status.presentationStatus,
  };

  const stageStatusValue = stageMap[stepKey];
  if (stageStatusValue === "failed" || failed.has(stepKey)) return "failed";
  if (stageStatusValue === "ready" || completed.has(stepKey)) return "complete";
  if (
    stageStatusValue === "running" ||
    progress.currentStage === stepKey
  ) {
    return "active";
  }
  return "pending";
}

interface ResultGenerationProgressProps {
  status: PublicGenerationStatus;
  onContinue?: () => void;
  showContinue?: boolean;
}

export function ResultGenerationProgress({
  status,
  onContinue,
  showContinue = false,
}: ResultGenerationProgressProps) {
  const percent = status.generationProgress.percent ?? 0;

  return (
    <div
      className="mb-8 rounded-2xl border border-champagne/30 bg-gradient-to-br from-beige/40 via-white to-white p-6 shadow-sm"
      onFocus={() => trackResultProgressViewed()}
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne">
        Private Brief Workspace
      </p>
      <h2 className="mt-1 font-serif text-2xl text-navy">
        Preparing your advisor brief
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        Your intake is saved. Sections will appear here as each advisor-safe
        layer becomes ready.
      </p>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-beige">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-champagne to-navy/70"
          animate={{ width: `${Math.max(8, percent)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <ul className="mt-6 space-y-4" aria-label="Brief generation progress">
        {PROGRESS_STEPS.map((step) => {
          const state = stepStatus(step.key, status);
          return (
            <li key={step.key} className="flex items-start gap-3">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  state === "complete"
                    ? "border-champagne bg-champagne text-navy"
                    : state === "active"
                      ? "border-navy bg-navy text-champagne"
                      : state === "failed"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white"
                }`}
              >
                {state === "complete" ? (
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                ) : state === "active" ? (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-champagne" />
                ) : null}
              </div>
              <div>
                <p
                  className={`text-sm ${
                    state === "active"
                      ? "font-medium text-navy"
                      : state === "complete"
                        ? "text-gray-600"
                        : state === "failed"
                          ? "text-red-700"
                          : "text-gray-400"
                  }`}
                >
                  {step.label}
                  {state === "failed" ? " · fallback available" : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {showContinue && onContinue ? (
        <div className="mt-6">
          <Button type="button" variant="secondary" onClick={onContinue}>
            Continue viewing brief
          </Button>
        </div>
      ) : null}
    </div>
  );
}
