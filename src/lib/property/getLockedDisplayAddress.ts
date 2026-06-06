import type { PropertyIntelligence } from "@/lib/property/types";
import {
  formatSellerAddress,
  type SellerAddressParts,
} from "@/lib/property/types";

const TRAILING_STREET_SUFFIXES = new Set([
  "st",
  "street",
  "ave",
  "avenue",
  "rd",
  "road",
  "dr",
  "drive",
  "blvd",
  "boulevard",
  "ln",
  "lane",
  "ct",
  "court",
  "way",
  "pl",
  "place",
  "pt",
  "cir",
  "circle",
]);

/** First line of address with trailing street-type suffixes removed. */
function streetLineCore(address: string): string {
  const streetLine = address.split(",")[0] ?? address;
  const tokens = streetLine
    .toLowerCase()
    .replace(/[,.#]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((t) => t.length > 0);

  const withoutSuffix = [...tokens];
  while (
    withoutSuffix.length > 0 &&
    TRAILING_STREET_SUFFIXES.has(withoutSuffix[withoutSuffix.length - 1]!)
  ) {
    withoutSuffix.pop();
  }

  return withoutSuffix.join(" ");
}

/** Street number token from the first line of an address (e.g. "18" from "18 Swimmers Point"). */
export function extractStreetNumberFromAddress(address: string): string | null {
  const streetLine = address.split(",")[0] ?? address;
  const token = streetLine
    .trim()
    .split(/\s+/)[0]
    ?.toLowerCase()
    .replace(/[,.#]/g, "");
  if (!token || !/^\d+[a-z]?$/i.test(token)) return null;
  return token.replace(/[a-z]$/, (m) => m.toLowerCase());
}

export interface LockedDisplayAddressResult {
  lockedDisplayAddress: string;
  submittedAddress: string;
  usedNormalized: boolean;
}

/**
 * Picks the seller-facing address for reports and AI prompts.
 * Submitted address wins unless Google normalized with high confidence and an exact street-number match.
 */
export function getLockedDisplayAddress(
  propertyAddress: SellerAddressParts,
  intelligence?: PropertyIntelligence | null
): LockedDisplayAddressResult {
  const submittedAddress = formatSellerAddress(propertyAddress);

  if (!intelligence) {
    return {
      lockedDisplayAddress: submittedAddress,
      submittedAddress,
      usedNormalized: false,
    };
  }

  const normalized = intelligence.normalizedAddress?.trim();

  if (!normalized) {
    return {
      lockedDisplayAddress: submittedAddress,
      submittedAddress,
      usedNormalized: false,
    };
  }

  if (
    intelligence.addressMatchConfidence !== "high" ||
    intelligence.addressDiscrepancy
  ) {
    return {
      lockedDisplayAddress: submittedAddress,
      submittedAddress,
      usedNormalized: false,
    };
  }

  const submittedNum = extractStreetNumberFromAddress(submittedAddress);
  const normalizedNum = extractStreetNumberFromAddress(normalized);

  if (!submittedNum || !normalizedNum || submittedNum !== normalizedNum) {
    return {
      lockedDisplayAddress: submittedAddress,
      submittedAddress,
      usedNormalized: false,
    };
  }

  return {
    lockedDisplayAddress: normalized,
    submittedAddress,
    usedNormalized: true,
  };
}

/** Street-line text after the number (e.g. "swimmers point") for mismatch detection. */
export function streetNameAfterNumber(address: string): string | null {
  const streetLine = address.split(",")[0]?.trim() ?? "";
  const num = extractStreetNumberFromAddress(streetLine);
  if (!num) return streetLineCore(streetLine) || null;
  const core = streetLineCore(streetLine);
  const numToken = streetLine
    .toLowerCase()
    .split(/\s+/)[0]
    ?.replace(/[,.#]/g, "");
  return core.replace(numToken ?? "", "").trim() || null;
}
