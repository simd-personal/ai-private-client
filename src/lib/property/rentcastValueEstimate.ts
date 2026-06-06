import type { RentCastComparableSummary } from "@/lib/property/equityPropertyTypes";
import type { RentCastPropertyFacts } from "@/lib/property/types";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface RentCastComparableRecord {
  distance?: number;
  price?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
}

interface RentCastValueEstimateResponse {
  price?: number;
  priceRangeLow?: number;
  priceRangeHigh?: number;
  comparables?: RentCastComparableRecord[];
  subjectProperty?: {
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    lotSize?: number;
    yearBuilt?: number;
    propertyType?: string;
    lastSaleDate?: string;
    lastSalePrice?: number;
  };
}

export interface RentCastValueEstimateResult {
  estimatedValue?: number;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  comparableCount: number;
  comparables: RentCastComparableSummary[];
  propertyFacts: RentCastPropertyFacts | null;
}

function normalizeComparable(
  comp: RentCastComparableRecord
): RentCastComparableSummary {
  const salePrice =
    comp.lastSalePrice != null && Number.isFinite(comp.lastSalePrice)
      ? comp.lastSalePrice
      : comp.price != null && Number.isFinite(comp.price)
        ? comp.price
        : undefined;

  return {
    distanceMiles: comp.distance,
    salePrice,
    saleDate: comp.lastSaleDate,
    bedrooms: comp.bedrooms,
    bathrooms: comp.bathrooms,
    squareFeet: comp.squareFootage,
    lotSize: comp.lotSize,
    yearBuilt: comp.yearBuilt,
  };
}

async function rentCastFetch<T>(
  path: string,
  apiKey: string
): Promise<T | null> {
  const url = `${RENTCAST_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "X-Api-Key": apiKey },
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    console.warn(
      `[rentcast] Request failed (${response.status}) for ${path.split("?")[0]}`
    );
    return null;
  }

  return (await response.json()) as T;
}

/**
 * Fetches RentCast AVM value estimate with range and comparable sale summaries.
 */
export async function getRentCastValueEstimate(
  address: string
): Promise<RentCastValueEstimateResult | null> {
  const apiKey = process.env.RENTCAST_API_KEY?.trim();
  if (!apiKey) return null;

  const encoded = encodeURIComponent(address.trim());
  if (!encoded) return null;

  try {
    const avm = await rentCastFetch<RentCastValueEstimateResponse>(
      `/avm/value?address=${encoded}`,
      apiKey
    );

    if (!avm) return null;

    const comparables = (avm.comparables ?? [])
      .map(normalizeComparable)
      .filter((c) => c.salePrice != null || c.squareFeet != null)
      .slice(0, 8);

    const subject = avm.subjectProperty;
    const propertyFacts: RentCastPropertyFacts | null = subject
      ? {
          bedrooms: subject.bedrooms,
          bathrooms: subject.bathrooms,
          squareFeet: subject.squareFootage,
          lotSize: subject.lotSize,
          yearBuilt: subject.yearBuilt,
          propertyType: subject.propertyType,
          lastSaleDate: subject.lastSaleDate,
          lastSalePrice: subject.lastSalePrice,
          estimatedValue:
            avm.price != null && Number.isFinite(avm.price)
              ? avm.price
              : undefined,
          dataSource: "rentcast",
        }
      : avm.price != null && Number.isFinite(avm.price)
        ? {
            estimatedValue: avm.price,
            dataSource: "rentcast",
          }
        : null;

    if (
      avm.price == null &&
      comparables.length === 0 &&
      propertyFacts?.estimatedValue == null
    ) {
      return null;
    }

    return {
      estimatedValue:
        avm.price != null && Number.isFinite(avm.price) ? avm.price : undefined,
      estimatedValueLow:
        avm.priceRangeLow != null && Number.isFinite(avm.priceRangeLow)
          ? avm.priceRangeLow
          : undefined,
      estimatedValueHigh:
        avm.priceRangeHigh != null && Number.isFinite(avm.priceRangeHigh)
          ? avm.priceRangeHigh
          : undefined,
      comparableCount: comparables.length,
      comparables,
      propertyFacts,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("[rentcast] Value estimate error:", message);
    return null;
  }
}
