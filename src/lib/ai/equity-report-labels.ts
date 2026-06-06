import { isRealFirstName, getFollowUpGreeting } from "@/lib/ai/report-labels";
import {
  formatCurrency,
  type EquityCalculations,
} from "@/lib/equity/calculateEquityMove";
import {
  EQUITY_GOAL_LABELS,
  EQUITY_TIMELINE_LABELS,
} from "@/lib/constants";
import type { EquityQuizData } from "@/lib/schemas/quiz";
import type { ReportSource } from "@/lib/ai/report-labels";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
} from "@/lib/tenants/tenant-config";

export function getEquityRecommendedNextStep(): string {
  const tenant = getDefaultTenant();
  return `The next step is to review the equity scenario with ${tenant.agentName}, pressure test the net proceeds range, and map the safest sequence for selling and buying.`;
}

export const EQUITY_RECOMMENDED_NEXT_STEP = getEquityRecommendedNextStep();

export function getEquitySequenceGuidance(): string {
  const tenant = getDefaultTenant();
  return `${tenant.agentName} can help evaluate options such as selling first, buying first, rent back terms, bridge financing, or a contingent structure depending on your risk tolerance, timeline, and the property you pursue.`;
}

export const EQUITY_SEQUENCE_GUIDANCE = getEquitySequenceGuidance();

export function formatGrossEquityPhrase(grossEquity: number): string {
  return `estimated gross equity of roughly ${formatCurrency(grossEquity)}`;
}

export function buildEquityReportTitle(firstName: string): string {
  const tenant = getDefaultTenant();
  return isRealFirstName(firstName)
    ? `Your Private Equity Move Up Plan, ${firstName.trim()}`
    : `Your Private ${getTenantSupportedRegionLabel(tenant)} Equity Move Up Plan`;
}

export function buildEquityFollowUpMessage(
  data: EquityQuizData,
  calcs: EquityCalculations
): string {
  const tenant = getDefaultTenant();
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const goal = EQUITY_GOAL_LABELS[data.nextMoveGoal].toLowerCase();
  const timeline = EQUITY_TIMELINE_LABELS[data.timeline].toLowerCase();
  const equity =
    calcs.grossEquity != null
      ? formatGrossEquityPhrase(calcs.grossEquity)
      : "your estimated gross equity";

  return `${greeting} I reviewed your Equity Move Up plan for your ${data.currentHomeCity} home. Based on ${equity} and your goal to ${goal} on a ${timeline} timeline, the next step is to review the net proceeds planning range, timing, and what your next move could unlock. ${tenant.agentName} can walk you through the planning ranges and coordinate CPA questions where needed.`;
}

export function estimateEquityReadiness(
  data: EquityQuizData,
  calcs: EquityCalculations
): number {
  let score = 40;

  if (
    calcs.ownershipYears !== null &&
    calcs.ownershipYears >= 7 &&
    calcs.ownershipYears <= 12
  ) {
    score += 15;
  }

  if (calcs.grossEquity !== null && calcs.grossEquity >= 500_000) score += 15;

  if (
    data.timeline === "now" ||
    data.timeline === "30 to 90 days" ||
    data.timeline === "3 to 6 months"
  ) {
    score += 15;
  }

  if (data.nextMoveGoal !== "just exploring") score += 10;

  if (data.freeText?.trim()) score += 10;

  if (data.contact.phone?.trim()) score += 5;

  return Math.min(95, score);
}

export function logReportSource(
  leadType: "equity",
  source: ReportSource
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[report] ${leadType} report source: ${source}`);
  }
}
