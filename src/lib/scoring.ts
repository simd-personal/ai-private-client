import { CALIFORNIA_LUXURY_MARKETS } from "@/lib/constants";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import type { EquityCalculations } from "@/lib/equity/calculateEquityMove";
import type { WealthForecastCalculations } from "@/lib/wealth/calculateWealthForecast";

export type LeadTemperature = "cold" | "warm" | "hot";

const HIGH_BUDGET_RANGES = new Set([
  "1500000 to 2500000",
  "2500000 to 5000000",
  "5000000 to 10000000",
  "10000000 plus",
]);

const URGENT_TIMELINES = new Set(["now", "30 to 90 days"]);

function hasSeriousIntent(text?: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  return trimmed.length >= 20;
}

function isLuxuryLocation(locations: string[]): boolean {
  return locations.some((loc) =>
    (CALIFORNIA_LUXURY_MARKETS as readonly string[]).includes(loc)
  );
}

export function calculateBuyerLeadScore(data: BuyerQuizData): number {
  let score = 0;

  if (URGENT_TIMELINES.has(data.timeline)) score += 25;
  if (HIGH_BUDGET_RANGES.has(data.budgetRange)) score += 20;
  if (data.financingStatus === "cash buyer" || data.financingStatus === "pre approved")
    score += 15;
  if (isLuxuryLocation(data.desiredLocations)) score += 15;
  if (data.contact.phone?.trim()) score += 10;
  if (hasSeriousIntent(data.freeText)) score += 10;
  if (
    data.contact.preferredContactMethod === "phone" ||
    data.contact.preferredContactMethod === "text"
  )
    score += 5;

  return Math.min(100, score);
}

export function calculateSellerLeadScore(data: SellerQuizData): number {
  let score = 0;

  if (URGENT_TIMELINES.has(data.sellingTimeline)) score += 25;
  if (HIGH_BUDGET_RANGES.has(data.estimatedValueRange)) score += 20;

  const { street, city, state, zip } = data.propertyAddress;
  if (street.trim() && city.trim() && state.trim() && zip.trim()) score += 15;

  const priorityScores = new Set([
    "highest price",
    "relocation",
    "privacy",
    "speed",
  ]);
  if (priorityScores.has(data.sellerPriority)) score += 15;

  if (data.contact.phone?.trim()) score += 10;
  if (hasSeriousIntent(data.upgrades)) score += 10;
  if (
    data.contact.preferredContactMethod === "phone" ||
    data.contact.preferredContactMethod === "text"
  )
    score += 5;

  return Math.min(100, score);
}

const EQUITY_URGENT_TIMELINES = new Set([
  "now",
  "30 to 90 days",
  "3 to 6 months",
]);

const EQUITY_ACTIVE_GOALS = new Set([
  "upsize",
  "downsize",
  "relocate within California",
  "buy second home",
]);

export function calculateEquityLeadScore(
  data: EquityQuizData,
  calculations: EquityCalculations
): number {
  let score = 0;

  if (
    calculations.ownershipYears !== null &&
    calculations.ownershipYears >= 7 &&
    calculations.ownershipYears <= 12
  ) {
    score += 25;
  }

  if ((data.estimatedCurrentValue ?? 0) >= 1_500_000) score += 20;

  if (
    calculations.grossEquity !== null &&
    calculations.grossEquity >= 500_000
  ) {
    score += 20;
  }

  if (EQUITY_URGENT_TIMELINES.has(data.timeline)) score += 15;

  if (EQUITY_ACTIVE_GOALS.has(data.nextMoveGoal)) score += 10;

  if (data.contact.phone?.trim()) score += 5;

  if (hasSeriousIntent(data.freeText)) score += 5;

  return Math.min(100, score);
}

const WEALTH_URGENT_TIMELINES = new Set([
  "now",
  "30_to_90_days",
  "3_to_6_months",
]);

const WEALTH_LIQUIDITY_SIGNALS = new Set([
  "recent_exit",
  "future_exit",
  "high_income_equity_comp",
  "reallocating_investments",
]);

const WEALTH_PROPERTY_USE_SIGNALS = new Set([
  "primary_residence",
  "second_home",
  "investment_property",
  "mixed_use",
]);

export function calculateWealthForecastLeadScore(
  data: WealthQuizData,
  calculations: WealthForecastCalculations
): number {
  let score = 0;

  if (
    calculations.purchasePrice != null &&
    calculations.purchasePrice >= 2_000_000
  ) {
    score += 25;
  }

  if (
    calculations.downPaymentAmount != null &&
    calculations.downPaymentAmount >= 500_000
  ) {
    score += 20;
  }

  if (WEALTH_URGENT_TIMELINES.has(data.timeline)) score += 15;

  if (WEALTH_LIQUIDITY_SIGNALS.has(data.liquiditySituation)) score += 15;

  if (WEALTH_PROPERTY_USE_SIGNALS.has(data.propertyUse)) score += 10;

  if (data.contact.phone?.trim()) score += 10;

  if (hasSeriousIntent(data.freeText)) score += 5;

  return Math.min(100, score);
}

export function getLeadTemperature(score: number): LeadTemperature {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}
