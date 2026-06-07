"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { trackResultProgressViewed } from "@/lib/analytics";

const PROGRESS_STEPS = [
  { key: "intake", label: "Intake received" },
  { key: "fast_brief", label: "Initial private brief ready" },
  { key: "strategy_room", label: "Preparing strategy room" },
  { key: "decision_layer", label: "Building decision map" },
  { key: "advisor_action_board", label: "Creating advisor review plan" },
  { key: "presentation", label: "Finalizing presentation view" },
] as const;

function stepStatus(
  stepKey: (typeof PROGRESS_STEPS)[number]["key"],
  status: PublicGenerationStatus
): "pending" | "active" | "complete" | "failed" {
  const progress = status.generationProgress;
  const completed = new Set(progress.completedStages ?? []);
  const failed = new Set(progress.failedStages ?? []);

  if (stepKey === "intake") {
    return "complete";
  }

  if (stepKey === "fast_brief") {
    if (status.isFastBriefReady || status.publicResultReady) return "complete";
    if (status.generationStatus === "intake_received") return "active";
    return "pending";
  }

  if (stepKey === "strategy_room") {
    if (status.strategyRoomStatus === "ready") return "complete";
    if (status.strategyRoomStatus === "failed") return "failed";
    if (status.strategyRoomStatus === "running") return "active";
    if (
      status.generationStatus === "generating" &&
      status.baseReportStatus === "ready"
    ) {
      return "active";
    }
    return "pending";
  }

  const stageMap: Record<string, PublicGenerationStatus["baseReportStatus"]> = {
    decision_layer: status.decisionLayerStatus,
    advisor_action_board: status.advisorActionBoardStatus,
    presentation: status.presentationStatus,
  };

  const stageStatusValue = stageMap[stepKey];
  if (stageStatusValue === "failed" || failed.has(stepKey)) return "failed";
  if (stageStatusValue === "ready" || completed.has(stepKey)) return "complete";
  if (stageStatusValue === "running" || progress.currentStage === stepKey) {
    return "active";
  }

  return "pending";
}

interface ResultGenerationProgressProps {
  status: PublicGenerationStatus;
  onContinue?: () => void;
  showContinue?: boolean;
  startedAt?: number;
}

export function ResultGenerationProgress({
  status,
  onContinue,
  showContinue = false,
  startedAt,
}: ResultGenerationProgressProps) {
  const percent =
    status.percentForPublicView ?? status.generationProgress.percent ?? 0;
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
    if (!startedAt || status.isReady) return;
    const timer = setTimeout(() => setShowSlowMessage(true), 60_000);
    return () => clearTimeout(timer);
  }, [startedAt, status.isReady]);

  return (
    <div
      className="mb-8 rounded-2xl border border-champagne/30 bg-gradient-to-br from-beige/40 via-white to-white p-6 shadow-sm"
      data-testid="result-generation-progress"
      onFocus={() => trackResultProgressViewed()}
    >
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-champagne">
        Private Brief Workspace
      </p>
      <h2 className="mt-1 font-serif text-2xl text-navy">
        {status.isFastBriefReady
          ? "Preparing deeper advisor sections"
          : "Preparing your advisor brief"}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {status.isFastBriefReady
          ? "Your private decision workspace is ready. We are still preparing deeper advisor coordination sections."
          : "Your intake is saved. Sections will appear here as each advisor-safe layer becomes ready."}
      </p>

      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-beige">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-champagne to-navy/70"
          animate={{ width: `${Math.max(8, percent)}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Current stage: {status.currentPublicStageLabel}
      </p>

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

      {showSlowMessage ? (
        <p className="mt-4 text-sm text-gray-600">
          Deeper advisor sections are still being prepared. You can refresh or
          continue with the initial brief.
        </p>
      ) : null}

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
