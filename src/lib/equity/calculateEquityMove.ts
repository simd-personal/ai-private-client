import {
  resolveCurrentValueSource,
  type CurrentValueSource,
  type EquityPropertyIntelligence,
} from "@/lib/property/equityPropertyTypes";
import type { EquityQuizData } from "@/lib/schemas/quiz";

export interface CalculateEquityMoveOptions {
  rentCastEstimatedValue?: number | null;
  /** When set, reconciles source against stored RentCast AVM on the lead. */
  equityPropertyIntelligence?: EquityPropertyIntelligence | null;
}

export type MoveCategory =
  | "early equity"
  | "standard equity"
  | "long tenure equity"
  | "high equity";

export interface EquityCalculations {
  currentValueSource: CurrentValueSource;
  estimatedAppreciation: number | null;
  grossEquity: number | null;
  sellingCostLow: number | null;
  sellingCostHigh: number | null;
  estimatedNetBeforeTaxLow: number | null;
  estimatedNetBeforeTaxHigh: number | null;
  capitalGainEstimate: number | null;
  exclusionEstimate: number | null;
  potentialTaxableGainEstimate: number | null;
  equityMultiple: number | null;
  ownershipYears: number | null;
  moveCategory: MoveCategory | null;
  sellingCostRange: string | null;
}

const SELLING_COST_LOW_RATE = 0.06;
const SELLING_COST_HIGH_RATE = 0.08;
const HIGH_EQUITY_THRESHOLD = 500_000;
const SINGLE_EXCLUSION = 250_000;
const MARRIED_EXCLUSION = 500_000;

function roundCurrency(value: number): number {
  return Math.round(value);
}

function getExclusionEstimate(
  filingStatus: EquityQuizData["filingStatus"]
): number {
  return filingStatus === "married_or_joint" ? MARRIED_EXCLUSION : SINGLE_EXCLUSION;
}

function getMoveCategory(
  ownershipYears: number | null,
  grossEquity: number | null
): MoveCategory | null {
  if (grossEquity !== null && grossEquity >= HIGH_EQUITY_THRESHOLD) {
    return "high equity";
  }
  if (ownershipYears === null) return null;
  if (ownershipYears >= 7 && ownershipYears <= 12) return "standard equity";
  if (ownershipYears < 7) return "early equity";
  return "long tenure equity";
}

function resolveEquityCurrentValueSource(
  data: EquityQuizData,
  options?: CalculateEquityMoveOptions
): CurrentValueSource {
  const rentCastEstimatedValue =
    options?.rentCastEstimatedValue ??
    options?.equityPropertyIntelligence?.estimatedValue ??
    null;
  const hasUserValue =
    data.estimatedCurrentValue != null && data.estimatedCurrentValue > 0;

  if (rentCastEstimatedValue != null && rentCastEstimatedValue > 0) {
    return resolveCurrentValueSource(data.valueEstimateChoice, {
      hasRentCastEstimate: true,
      hasUserValue,
      userValue: data.estimatedCurrentValue,
      rentCastEstimate: rentCastEstimatedValue,
    });
  }

  if (
    hasUserValue &&
    data.currentValueSource &&
    data.currentValueSource !== "unknown"
  ) {
    return data.currentValueSource;
  }

  if (hasUserValue) {
    return resolveCurrentValueSource(data.valueEstimateChoice, {
      hasRentCastEstimate: false,
      hasUserValue: true,
      userValue: data.estimatedCurrentValue,
    });
  }

  return "unknown";
}

export function calculateEquityMove(
  data: EquityQuizData,
  options?: CalculateEquityMoveOptions
): EquityCalculations {
  const currentYear = new Date().getFullYear();
  const ownershipYears =
    data.yearPurchased > 0 && data.yearPurchased <= currentYear
      ? currentYear - data.yearPurchased
      : null;

  const currentValueSource = resolveEquityCurrentValueSource(data, options);
  const hasCurrentValue =
    data.estimatedCurrentValue != null &&
    data.estimatedCurrentValue > 0 &&
    currentValueSource !== "unknown";

  const estimatedAppreciation =
    hasCurrentValue && data.originalPurchasePrice != null
      ? roundCurrency(data.estimatedCurrentValue! - data.originalPurchasePrice)
      : null;

  const grossEquity =
    hasCurrentValue && data.mortgageBalance != null
      ? roundCurrency(data.estimatedCurrentValue! - data.mortgageBalance)
      : null;

  const sellingCostLow = hasCurrentValue
      ? roundCurrency(data.estimatedCurrentValue! * SELLING_COST_LOW_RATE)
      : null;

  const sellingCostHigh = hasCurrentValue
      ? roundCurrency(data.estimatedCurrentValue! * SELLING_COST_HIGH_RATE)
      : null;

  const estimatedNetBeforeTaxLow =
    grossEquity != null && sellingCostHigh != null
      ? roundCurrency(grossEquity - sellingCostHigh)
      : null;

  const estimatedNetBeforeTaxHigh =
    grossEquity != null && sellingCostLow != null
      ? roundCurrency(grossEquity - sellingCostLow)
      : null;

  const improvements = data.estimatedImprovements ?? 0;
  const capitalGainEstimate =
    hasCurrentValue && data.originalPurchasePrice != null
      ? roundCurrency(
          data.estimatedCurrentValue! -
            data.originalPurchasePrice -
            improvements
        )
      : null;

  const exclusionEstimate = getExclusionEstimate(data.filingStatus);

  const potentialTaxableGainEstimate =
    capitalGainEstimate != null
      ? roundCurrency(Math.max(0, capitalGainEstimate - exclusionEstimate))
      : null;

  const equityMultiple = null;

  const moveCategory = getMoveCategory(ownershipYears, grossEquity);

  const sellingCostRange =
    sellingCostLow != null && sellingCostHigh != null
      ? `${formatCurrency(sellingCostLow)} – ${formatCurrency(sellingCostHigh)} (6%–8% of estimated value)`
      : "6%–8% of estimated value";

  return {
    currentValueSource,
    estimatedAppreciation,
    grossEquity,
    sellingCostLow,
    sellingCostHigh,
    estimatedNetBeforeTaxLow,
    estimatedNetBeforeTaxHigh,
    capitalGainEstimate,
    exclusionEstimate,
    potentialTaxableGainEstimate,
    equityMultiple,
    ownershipYears,
    moveCategory,
    sellingCostRange,
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}
