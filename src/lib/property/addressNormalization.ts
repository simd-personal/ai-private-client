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

/** Street-line tokens with only trailing type suffixes removed (keeps "Harbor Point", "Swimmers Point"). */
function streetLineTokens(address: string): string[] {
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

  return withoutSuffix;
}

function extractStreetNumber(tokens: string[]): string | null {
  return tokens.find((t) => /^\d+[a-z]?$/i.test(t)) ?? null;
}

const DIRECTIONAL_TOKENS = new Set([
  "n",
  "s",
  "e",
  "w",
  "ne",
  "nw",
  "se",
  "sw",
  "north",
  "south",
  "east",
  "west",
]);

function streetCoreKey(tokens: string[]): string {
  return tokens
    .filter((t) => !DIRECTIONAL_TOKENS.has(t))
    .sort()
    .join(" ");
}

export type AddressMatchConfidence = "high" | "low";

export interface AddressMatchAssessment {
  submittedAddress: string;
  normalizedAddress: string;
  addressMatchConfidence: AddressMatchConfidence;
  addressDiscrepancy: boolean;
}

/**
 * Detects when Google's normalized address likely points to a different street
 * than the seller submitted (e.g. Point vs Blvd).
 */
export function assessAddressMatch(
  submittedAddress: string,
  normalizedAddress: string
): AddressMatchAssessment {
  const submitted = submittedAddress.trim();
  const normalized = normalizedAddress.trim();

  if (!submitted || !normalized) {
    return {
      submittedAddress: submitted,
      normalizedAddress: normalized,
      addressMatchConfidence: "high",
      addressDiscrepancy: false,
    };
  }

  const subTokens = streetLineTokens(submitted);
  const normTokens = streetLineTokens(normalized);
  const subNum = extractStreetNumber(subTokens);
  const normNum = extractStreetNumber(normTokens);

  const numberMismatch =
    subNum != null && normNum != null && subNum !== normNum;

  const subStreetCore = subTokens.filter((t) => t !== subNum);
  const normStreetCore = normTokens.filter((t) => t !== normNum);

  const streetNameMismatch =
    subStreetCore.length > 0 &&
    normStreetCore.length > 0 &&
    streetCoreKey(subStreetCore) !== streetCoreKey(normStreetCore);

  const discrepancy = numberMismatch || streetNameMismatch;

  return {
    submittedAddress: submitted,
    normalizedAddress: normalized,
    addressMatchConfidence: discrepancy ? "low" : "high",
    addressDiscrepancy: discrepancy,
  };
}

export const GENERIC_ADDRESS_VERIFICATION_PROMPT =
  "The first review should verify the submitted address and core property facts before any seller materials are prepared.";
