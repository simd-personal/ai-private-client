import type {
  EquityGoogleAddressContext,
  EquityPropertyIntelligence,
  EstimationConfidence,
  PublicEquityEstimateResponse,
} from "@/lib/property/equityPropertyTypes";
import { getGoogleNormalizedAddress } from "@/lib/property/googleMaps";
import { getRentCastValueEstimate } from "@/lib/property/rentcastValueEstimate";

export interface EnrichEquityPropertyInput {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  yearPurchased?: number;
  originalPurchasePrice?: number;
  mortgageBalance?: number;
  squareFeet?: number;
}

function buildFullAddress(input: EnrichEquityPropertyInput): string {
  const trimmed = input.address.trim();
  if (trimmed.includes(",")) return trimmed;
  const city = input.city?.trim();
  const state = input.state?.trim() ?? "CA";
  const zip = input.zip?.trim();
  if (city && zip) return `${trimmed}, ${city}, ${state} ${zip}`;
  if (city) return `${trimmed}, ${city}, ${state}`;
  return trimmed;
}

function deriveEstimationConfidence(
  hasEstimate: boolean,
  hasRange: boolean,
  comparableCount: number,
  addressConfidence: "high" | "low"
): EstimationConfidence {
  if (!hasEstimate) return "unavailable";
  if (hasEstimate && hasRange && comparableCount >= 3 && addressConfidence === "high") {
    return "high";
  }
  if (hasEstimate && comparableCount >= 1) return "medium";
  if (hasEstimate) return "low";
  return "unavailable";
}

function buildMissingDataQuestions(
  hasEstimate: boolean,
  addressDiscrepancy: boolean
): string[] {
  const questions: string[] = [];
  if (addressDiscrepancy) {
    questions.push(
      "Verify the submitted property address with the homeowner before using any automated planning estimate."
    );
  }
  if (!hasEstimate) {
    questions.push(
      "Estimate the home's current market range with the homeowner before modeling net proceeds."
    );
  }
  return questions;
}

/**
 * Enriches equity quiz context with RentCast planning estimates and Google address validation.
 */
export async function enrichEquityProperty(
  input: EnrichEquityPropertyInput
): Promise<EquityPropertyIntelligence> {
  const fullAddress = buildFullAddress(input);
  const submittedAddress = fullAddress;

  const [rentCast, google] = await Promise.all([
    getRentCastValueEstimate(fullAddress),
    getGoogleNormalizedAddress(fullAddress),
  ]);

  const dataSources = new Set<string>();
  if (rentCast?.estimatedValue != null || (rentCast?.comparableCount ?? 0) > 0) {
    dataSources.add("rentcast");
  }
  if (google) dataSources.add("google_maps_api");

  const normalizedAddress =
    google?.normalizedAddress ?? submittedAddress;
  const addressConfidence = google?.addressConfidence ?? "high";

  const estimatedValue = rentCast?.estimatedValue;
  const hasEstimate = estimatedValue != null && estimatedValue > 0;
  const hasRange =
    rentCast?.estimatedValueLow != null && rentCast?.estimatedValueHigh != null;

  const googleAddressContext: EquityGoogleAddressContext | null = google
    ? {
        normalizedAddress: google.normalizedAddress,
        submittedAddress: google.submittedAddress,
        addressConfidence: google.addressConfidence,
        addressDiscrepancy: google.addressDiscrepancy,
      }
    : null;

  return {
    normalizedAddress,
    addressConfidence,
    estimatedValue,
    estimatedValueLow: rentCast?.estimatedValueLow,
    estimatedValueHigh: rentCast?.estimatedValueHigh,
    comparableCount: rentCast?.comparableCount ?? 0,
    compsSummary: rentCast?.comparables ?? [],
    rentCastFacts: rentCast?.propertyFacts ?? null,
    googleAddressContext,
    dataSources: [...dataSources],
    missingDataQuestions: buildMissingDataQuestions(
      hasEstimate,
      google?.addressDiscrepancy ?? false
    ),
    estimationConfidence: deriveEstimationConfidence(
      hasEstimate,
      hasRange,
      rentCast?.comparableCount ?? 0,
      addressConfidence
    ),
  };
}

/** Public-safe response for the equity quiz estimate step. */
export function toPublicEquityEstimateResponse(
  intelligence: EquityPropertyIntelligence,
  options: { apiKeysConfigured: boolean }
): PublicEquityEstimateResponse {
  const hasEstimate =
    intelligence.estimatedValue != null && intelligence.estimatedValue > 0;

  if (!options.apiKeysConfigured) {
    return {
      available: false,
      estimationConfidence: "unavailable",
      dataSources: [],
      message:
        "Automated planning estimates are not configured. You can enter your best guess, or leave this blank for advisor review.",
    };
  }

  if (!hasEstimate) {
    return {
      available: false,
      normalizedAddress: intelligence.normalizedAddress,
      estimationConfidence: "unavailable",
      dataSources: intelligence.dataSources,
      message:
        "We could not find a reliable automated estimate. You can enter your best guess, or leave this blank for advisor review.",
    };
  }

  return {
    available: true,
    normalizedAddress: intelligence.normalizedAddress,
    estimatedValue: intelligence.estimatedValue,
    estimatedValueLow: intelligence.estimatedValueLow,
    estimatedValueHigh: intelligence.estimatedValueHigh,
    comparableCount: intelligence.comparableCount,
    estimationConfidence: intelligence.estimationConfidence,
    dataSources: ["property_data_provider"],
    message: "Planning estimate available from property data provider.",
  };
}
