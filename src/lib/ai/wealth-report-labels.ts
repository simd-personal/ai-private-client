import { isRealFirstName, fixWealthFollowUpTypo } from "@/lib/ai/report-labels";
import {
  WEALTH_DISCLAIMER,
  WEALTH_LEVERAGE_LABELS,
  WEALTH_LIQUIDITY_LABELS,
  WEALTH_PROPERTY_USE_LABELS,
  WEALTH_TIMELINE_LABELS,
  type WEALTH_PROPERTY_USES,
} from "@/lib/constants";
import {
  formatCurrency,
  type WealthForecastCalculations,
} from "@/lib/wealth/calculateWealthForecast";
import type { WealthQuizData } from "@/lib/schemas/quiz";
import type { ReportSource } from "@/lib/ai/report-labels";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
} from "@/lib/tenants/tenant-config";

export function getWealthRecommendedNextStep(): string {
  const tenant = getDefaultTenant();
  return `The next step is to review this planning scenario with ${tenant.agentName}, pressure test the assumptions with a lender, and confirm tax topics with a CPA before making any purchase decision.`;
}

export const WEALTH_RECOMMENDED_NEXT_STEP = getWealthRecommendedNextStep();

export function buildWealthReportTitle(firstName: string): string {
  const tenant = getDefaultTenant();
  if (isRealFirstName(firstName)) {
    return `Your Real Estate Wealth Forecast, ${firstName}`;
  }
  return `Your Private ${getTenantSupportedRegionLabel(tenant)} Real Estate Wealth Forecast`;
}

export function buildTaxPlanningTopics(
  propertyUse: (typeof WEALTH_PROPERTY_USES)[number]
): string[] {
  const topics: string[] = [];

  if (
    propertyUse === "primary_residence" ||
    propertyUse === "second_home"
  ) {
    topics.push(
      "Mortgage interest deduction may be relevant as a CPA planning topic, subject to IRS limits and your overall tax picture — review with a CPA."
    );
  }

  if (propertyUse === "primary_residence") {
    topics.push(
      "Future capital gains exclusion on a primary residence may be relevant as a CPA planning topic — confirm eligibility and limits with a CPA."
    );
  }

  if (
    propertyUse === "investment_property" ||
    propertyUse === "mixed_use"
  ) {
    topics.push(
      "Depreciation and cost recovery may be relevant as a CPA planning topic for this property use — review with a CPA."
    );
  }

  if (propertyUse === "investment_property") {
    topics.push(
      "A 1031 exchange may be worth discussing with a CPA or tax attorney in certain hold and exit scenarios — not applicable to every purchase."
    );
  }

  if (topics.length === 0) {
    topics.push(
      "Confirm how property use, hold period, and financing structure affect your tax picture with a CPA before you act."
    );
  }

  return topics;
}

export function estimateWealthReadiness(
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): number {
  let score = 40;
  if (calcs.purchasePrice != null && calcs.purchasePrice >= 1_500_000) score += 15;
  if (data.timeline === "now" || data.timeline === "30_to_90_days") score += 15;
  if (data.liquiditySituation !== "just_exploring") score += 10;
  if (data.leveragePreference !== "not_sure") score += 10;
  if (data.targetLocations.length >= 1) score += 10;
  return Math.min(100, score);
}

export function buildWealthFollowUpMessage(
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): string {
  const tenant = getDefaultTenant();
  const greeting = isRealFirstName(data.contact.firstName)
    ? `Hi ${data.contact.firstName},`
    : "Hi there,";
  const locations = data.targetLocations.join(", ");
  const carry =
    calcs.estimatedMonthlyCarry != null
      ? formatCurrency(calcs.estimatedMonthlyCarry)
      : "your modeled carry";
  const price =
    calcs.purchasePrice != null
      ? formatCurrency(calcs.purchasePrice)
      : "your target purchase";

  return fixWealthFollowUpTypo(
    `${greeting} Thank you for completing the Real Estate Wealth Forecast. Based on ${price} in ${locations} with an estimated monthly carry near ${carry}, I'd like to review the scenario assumptions, leverage posture, and timing with you. ${tenant.agentName} can pressure test the model with a lender and identify which CPA topics matter for your property use.`
  );
}

export function logReportSource(
  _leadType: "wealth_forecast",
  source: ReportSource
): void {
  if (process.env.NODE_ENV === "development" || process.env.AI_TEST === "1") {
    console.log(`[report:wealth_forecast] source=${source}`);
  }
}

export function formatWealthInternalSummary(
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): string {
  const tenant = getDefaultTenant();
  const price =
    calcs.purchasePrice != null
      ? formatCurrency(calcs.purchasePrice)
      : "n/a";
  const down =
    calcs.downPaymentAmount != null
      ? formatCurrency(calcs.downPaymentAmount)
      : "n/a";
  const loan =
    calcs.loanAmount != null ? formatCurrency(calcs.loanAmount) : "n/a";
  const carry =
    calcs.estimatedMonthlyCarry != null
      ? formatCurrency(calcs.estimatedMonthlyCarry)
      : "n/a";

  return [
    `${data.contact.firstName} ${data.contact.lastName}.`,
    `Purchase ${price}, down ${down}, loan ${loan}.`,
    `Use: ${WEALTH_PROPERTY_USE_LABELS[data.propertyUse]}.`,
    `Locations: ${data.targetLocations.join(", ")}.`,
    `Hold ${data.holdPeriodYears} yrs, carry ~${carry}/mo.`,
    `Liquidity: ${WEALTH_LIQUIDITY_LABELS[data.liquiditySituation]}.`,
    `Leverage: ${WEALTH_LEVERAGE_LABELS[data.leveragePreference]}.`,
    `Timeline: ${WEALTH_TIMELINE_LABELS[data.timeline]}.`,
    `Intent: entrepreneur wealth planning — review scenario with ${tenant.agentName} and CPA/lender.`,
    `Follow up on ${data.propertyUse === "investment_property" ? "investment hold scenario" : "purchase timing"}, leverage fit, and carry comfort.`,
  ].join(" ");
}

export { WEALTH_DISCLAIMER };
