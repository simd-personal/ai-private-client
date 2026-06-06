import type { AddressMatchConfidence, SellerAddressParts } from "@/lib/property/types";
import type { RentCastPropertyFacts } from "@/lib/property/types";

export function formatEquityAddress(address: SellerAddressParts): string {
  return `${address.street.trim()}, ${address.city.trim()}, ${address.state.trim()} ${address.zip.trim()}`;
}

function planningValuesMatch(
  userValue: number | undefined,
  rentCastEstimate: number | undefined
): boolean {
  if (userValue == null || rentCastEstimate == null) return false;
  if (userValue <= 0 || rentCastEstimate <= 0) return false;
  return Math.round(userValue) === Math.round(rentCastEstimate);
}

/**
 * Resolves the value source label from quiz choice and the value actually used in calculations.
 * RentCast is only labeled when the user accepted the API estimate unchanged.
 */
export function resolveCurrentValueSource(
  choice: (typeof VALUE_ESTIMATE_CHOICES)[number] | undefined,
  options: {
    hasRentCastEstimate: boolean;
    hasUserValue: boolean;
    userValue?: number | null;
    rentCastEstimate?: number | null;
  }
): CurrentValueSource {
  if (!options.hasUserValue) return "unknown";
  if (choice === "unsure") return "unknown";

  const rentcastMatchesUser = planningValuesMatch(
    options.userValue ?? undefined,
    options.rentCastEstimate ?? undefined
  );

  if (choice === "use_estimate" && options.hasRentCastEstimate) {
    return rentcastMatchesUser ? "rentcast_estimate" : "user_adjusted";
  }
  if (choice === "adjust") return "user_adjusted";
  return "user_provided";
}

export const CURRENT_VALUE_SOURCES = [
  "rentcast_estimate",
  "user_adjusted",
  "user_provided",
  "unknown",
] as const;

export type CurrentValueSource = (typeof CURRENT_VALUE_SOURCES)[number];

export const VALUE_ESTIMATE_CHOICES = [
  "use_estimate",
  "adjust",
  "unsure",
] as const;

export type ValueEstimateChoice = (typeof VALUE_ESTIMATE_CHOICES)[number];

export const ESTIMATION_CONFIDENCE_LEVELS = [
  "high",
  "medium",
  "low",
  "unavailable",
] as const;

export type EstimationConfidence = (typeof ESTIMATION_CONFIDENCE_LEVELS)[number];

export interface RentCastComparableSummary {
  distanceMiles?: number;
  salePrice?: number;
  saleDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
}

export interface EquityGoogleAddressContext {
  normalizedAddress: string;
  submittedAddress: string;
  addressConfidence: AddressMatchConfidence;
  addressDiscrepancy: boolean;
}

export interface EquityPropertyIntelligence {
  normalizedAddress: string;
  addressConfidence: AddressMatchConfidence;
  estimatedValue?: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  comparableCount: number;
  /** Admin-only summaries — no owner names or full addresses. */
  compsSummary: RentCastComparableSummary[];
  rentCastFacts: RentCastPropertyFacts | null;
  googleAddressContext: EquityGoogleAddressContext | null;
  dataSources: string[];
  missingDataQuestions: string[];
  estimationConfidence: EstimationConfidence;
}

export interface PublicEquityEstimateResponse {
  available: boolean;
  normalizedAddress?: string;
  estimatedValue?: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  comparableCount?: number;
  estimationConfidence: EstimationConfidence;
  dataSources: string[];
  message: string;
}
