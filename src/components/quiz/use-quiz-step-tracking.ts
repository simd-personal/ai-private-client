"use client";

import { useEffect } from "react";
import { trackQuizStepViewed } from "@/lib/analytics/site-events";

export function useQuizStepTracking(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  step: number,
  totalSteps: number
): void {
  useEffect(() => {
    trackQuizStepViewed({
      lead_type: leadType,
      step,
      total_steps: totalSteps,
    });
  }, [leadType, step, totalSteps]);
}
