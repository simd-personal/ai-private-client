import type { RentCastPropertyFacts } from "@/lib/property/types";

const RENTCAST_BASE = "https://api.rentcast.io/v1";

interface RentCastRecord {
  bedrooms?: number;
  bathrooms?: number;
  squareFootage?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  lastSaleDate?: string;
  lastSalePrice?: number;
  taxAssessments?: Record<
    string,
    { year?: number; value?: number; land?: number; improvements?: number }
  >;
}

interface RentCastAvmValue {
  price?: number;
}

interface RentCastAvmRent {
  rent?: number;
}

function latestAssessedValue(
  taxAssessments?: RentCastRecord["taxAssessments"]
): number | undefined {
  if (!taxAssessments) return undefined;
  const years = Object.keys(taxAssessments)
    .map((y) => Number.parseInt(y, 10))
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);
  for (const year of years) {
    const entry = taxAssessments[String(year)];
    if (entry?.value != null && Number.isFinite(entry.value)) {
      return entry.value;
    }
  }
  return undefined;
}

function normalizeRecord(record: RentCastRecord): RentCastPropertyFacts {
  return {
    bedrooms: record.bedrooms,
    bathrooms: record.bathrooms,
    squareFeet: record.squareFootage,
    lotSize: record.lotSize,
    yearBuilt: record.yearBuilt,
    propertyType: record.propertyType,
    lastSaleDate: record.lastSaleDate,
    lastSalePrice: record.lastSalePrice,
    assessedValue: latestAssessedValue(record.taxAssessments),
    dataSource: "rentcast",
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
 * Fetches normalized property facts from RentCast for a full street address.
 * Returns null when RENTCAST_API_KEY is unset or the request fails.
 */
export async function getRentCastPropertyFacts(
  address: string
): Promise<RentCastPropertyFacts | null> {
  const apiKey = process.env.RENTCAST_API_KEY?.trim();
  if (!apiKey) return null;

  const encoded = encodeURIComponent(address.trim());
  if (!encoded) return null;

  try {
    const records = await rentCastFetch<RentCastRecord[]>(
      `/properties?address=${encoded}`,
      apiKey
    );

    const record = Array.isArray(records) ? records[0] : null;
    if (!record) {
      console.warn("[rentcast] No property record returned for address lookup");
      return null;
    }

    const facts = normalizeRecord(record);

    const [avmValue, avmRent] = await Promise.all([
      rentCastFetch<RentCastAvmValue>(
        `/avm/value?address=${encoded}`,
        apiKey
      ),
      rentCastFetch<RentCastAvmRent>(
        `/avm/rent/long-term?address=${encoded}`,
        apiKey
      ),
    ]);

    if (avmValue?.price != null && Number.isFinite(avmValue.price)) {
      facts.estimatedValue = avmValue.price;
    }
    if (avmRent?.rent != null && Number.isFinite(avmRent.rent)) {
      facts.rentEstimate = avmRent.rent;
    }

    return facts;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.warn("[rentcast] Property lookup error:", message);
    return null;
  }
}
