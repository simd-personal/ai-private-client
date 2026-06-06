import type {
  RentCastPropertyFacts,
  RentCastMismatch,
  SellerProvidedPropertyFacts,
} from "@/lib/property/types";

function formatMismatchValue(value: string | number): string {
  return typeof value === "number" ? String(value) : value;
}

function compareNumericField(
  field: RentCastMismatch["field"],
  label: string,
  seller?: number,
  rentCast?: number,
  tolerance = 0
): RentCastMismatch | null {
  if (seller == null || rentCast == null) return null;
  if (Math.abs(seller - rentCast) <= tolerance) return null;
  return {
    field,
    label,
    sellerValue: formatMismatchValue(seller),
    rentCastValue: formatMismatchValue(rentCast),
  };
}

export function buildRentCastMismatches(
  seller: SellerProvidedPropertyFacts,
  rentCast: RentCastPropertyFacts | null
): RentCastMismatch[] {
  if (!rentCast) return [];

  return [
    compareNumericField("bedrooms", "Bedrooms", seller.bedrooms, rentCast.bedrooms),
    compareNumericField(
      "bathrooms",
      "Bathrooms",
      seller.bathrooms,
      rentCast.bathrooms,
      0.25
    ),
    compareNumericField(
      "squareFeet",
      "Square feet",
      seller.squareFeet,
      rentCast.squareFeet,
      50
    ),
    compareNumericField(
      "yearBuilt",
      "Year built",
      seller.yearBuilt,
      rentCast.yearBuilt
    ),
  ].filter((m): m is RentCastMismatch => m != null);
}

export const GENERIC_RENTCAST_MISMATCH_PROMPT =
  "Property facts from third-party data should be verified against seller-provided details before launch.";
