import type { SellerAiReport } from "@/lib/schemas/ai-report";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const USA_PATTERN = /^(usa|u\.s\.a\.?)$/i;
const ZIP_PATTERN = /^\d{5}(-\d{4})?$/;
const STATE_ABBR_PATTERN = /^[a-z]{2}$/i;
const CALIFORNIA_PATTERN = /^california$/i;

const AWKWARD_PROPERTY_CITIES = [
  "Newport Beach",
  "Irvine",
  "Costa Mesa",
  "Laguna Beach",
  "Huntington Beach",
  "Manhattan Beach",
  "Palos Verdes",
  "Los Angeles",
] as const;

function isSkippableAddressPart(part: string): boolean {
  if (USA_PATTERN.test(part)) return true;
  if (ZIP_PATTERN.test(part)) return true;
  if (CALIFORNIA_PATTERN.test(part)) return true;
  if (STATE_ABBR_PATTERN.test(part) && part.length === 2) return true;
  return false;
}

function dedupePartsCaseInsensitive(parts: string[]): string[] {
  const result: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (result.some((existing) => existing.toLowerCase() === key)) continue;
    result.push(part);
  }
  return result;
}

/**
 * Street + city for public copy. Drops state, ZIP, USA, and repeated city tokens.
 */
export function formatPublicAddress(fullAddress: string, city?: string): string {
  const rawParts = fullAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawParts.length === 0) return fullAddress.trim();

  const street = rawParts[0]!;
  const cityHint = city?.trim();

  const meaningful = dedupePartsCaseInsensitive(
    rawParts.slice(1).filter((part) => !isSkippableAddressPart(part))
  );

  if (cityHint) {
    const cityLower = cityHint.toLowerCase();
    if (street.toLowerCase().includes(cityLower)) {
      return street;
    }
    const cityInAddress = meaningful.find(
      (part) => part.toLowerCase() === cityLower
    );
    if (cityInAddress) {
      return `${street}, ${cityInAddress}`;
    }
    if (meaningful.length === 0) {
      return `${street}, ${cityHint}`;
    }
    return `${street}, ${meaningful[0]}`;
  }

  if (meaningful.length > 0) {
    return `${street}, ${meaningful[0]}`;
  }

  return street;
}

/** Removes repeated city tokens such as "Newport Beach, Newport Beach". */
export function collapseDuplicateCityPhrasing(text: string, city: string): string {
  const trimmedCity = city.trim();
  if (!trimmedCity || !text.trim()) return text;

  const escaped = escapeRegex(trimmedCity);
  let result = text.replace(
    new RegExp(`(${escaped})(\\s*,\\s*\\1)+`, "gi"),
    "$1"
  );

  for (const knownCity of AWKWARD_PROPERTY_CITIES) {
    if (knownCity.toLowerCase() === trimmedCity.toLowerCase()) continue;
    const knownEscaped = escapeRegex(knownCity);
    result = result.replace(
      new RegExp(`(${knownEscaped})(\\s*,\\s*\\1)+`, "gi"),
      "$1"
    );
  }

  return result;
}

/** Fixes robotic "For the property, {city}" phrasing from address-budget fallbacks. */
export function fixAwkwardPropertyCityPhrasing(text: string, city: string): string {
  let result = collapseDuplicateCityPhrasing(text, city);

  for (const knownCity of AWKWARD_PROPERTY_CITIES) {
    const escaped = escapeRegex(knownCity);
    result = result.replace(
      new RegExp(`\\bFor the property,\\s*${escaped}\\s*,`, "gi"),
      `For this ${knownCity} residence,`
    );
    result = result.replace(
      new RegExp(`\\bFor the property,\\s*${escaped}\\b`, "gi"),
      `For this ${knownCity} residence`
    );
    result = result.replace(
      new RegExp(`\\bthe property,\\s*${escaped}\\b`, "gi"),
      `this ${knownCity} residence`
    );
  }

  const cityTrimmed = city.trim();
  if (cityTrimmed) {
    const escaped = escapeRegex(cityTrimmed);
    result = result.replace(
      new RegExp(`\\bFor the property,\\s*${escaped}\\s*,`, "gi"),
      `For this ${cityTrimmed} residence,`
    );
    result = result.replace(
      new RegExp(`\\bFor the property,\\s*${escaped}\\b`, "gi"),
      `For this ${cityTrimmed} residence`
    );
    result = result.replace(
      new RegExp(`\\bthe property,\\s*${escaped}\\b`, "gi"),
      `this ${cityTrimmed} residence`
    );
  }

  return result;
}

export function publicAddressHasDuplicateCity(
  publicAddress: string,
  city: string
): boolean {
  const trimmedCity = city.trim();
  if (!trimmedCity) return false;
  const pattern = new RegExp(
    `${escapeRegex(trimmedCity)}\\s*,\\s*${escapeRegex(trimmedCity)}`,
    "i"
  );
  return pattern.test(publicAddress);
}

export function buildAddressVariants(
  lockedDisplayAddress: string,
  publicAddress?: string,
  city?: string
): string[] {
  const pub =
    publicAddress ?? formatPublicAddress(lockedDisplayAddress, city);
  const withoutUsa = lockedDisplayAddress.replace(/,?\s*USA\s*$/i, "").trim();

  return [...new Set([lockedDisplayAddress, withoutUsa, pub].filter(
    (value) => value.length > 3
  ))].sort((a, b) => b.length - a.length);
}

export interface AddressMentionBudget {
  remaining: number;
}

const addressAlternates = (city: string) => {
  const trimmed = city.trim();
  if (trimmed) {
    return [
      `this ${trimmed} residence`,
      "the residence",
      "the home",
      "this property",
      "this seller profile",
    ];
  }
  return ["the residence", "the home", "this property", "this seller profile"];
};

/** Replaces address mentions beyond budget with natural alternates. */
export function limitAddressMentions(
  text: string,
  lockedDisplayAddress: string,
  maxMentions: number,
  budget?: AddressMentionBudget,
  city = ""
): string {
  if (!text.trim() || maxMentions <= 0) return text;

  const state = budget ?? { remaining: maxMentions };
  const publicAddress = formatPublicAddress(lockedDisplayAddress, city);
  const patterns = buildAddressVariants(lockedDisplayAddress, publicAddress, city);
  const alternates = addressAlternates(city);
  let altIndex = 0;

  let result = text;
  for (const pattern of patterns) {
    const re = new RegExp(escapeRegex(pattern), "gi");
    result = result.replace(re, () => {
      if (state.remaining > 0) {
        state.remaining--;
        return publicAddress;
      }
      const replacement = alternates[altIndex % alternates.length]!;
      altIndex++;
      return replacement;
    });
  }

  return result;
}

export function stripLeadingAddressPhrase(
  text: string,
  addressVariants: string[]
): string {
  let result = text.trim();
  if (!result) return result;

  for (const variant of addressVariants) {
    const escaped = escapeRegex(variant);
    const leading = new RegExp(
      `^(?:For|At|Regarding)\\s+${escaped}\\s*,\\s*`,
      "i"
    );
    if (leading.test(result)) {
      result = result.replace(leading, "").trim();
      result = result.charAt(0).toUpperCase() + result.slice(1);
      break;
    }
  }

  return result;
}

function normalizeAddressesInText(
  text: string,
  variants: string[],
  publicAddress: string
): string {
  let result = text;
  const streetOnly = publicAddress.split(",")[0]?.trim() ?? "";

  for (const variant of variants) {
    if (!variant || variant === publicAddress) continue;
    if (
      streetOnly &&
      variant.toLowerCase() === streetOnly.toLowerCase()
    ) {
      continue;
    }
    result = result.split(variant).join(publicAddress);
  }

  return result;
}

function polishSellerText(
  text: string,
  options: {
    lockedDisplayAddress: string;
    city: string;
    stripLeading: boolean;
    budget: AddressMentionBudget;
  }
): string {
  const publicAddress = formatPublicAddress(
    options.lockedDisplayAddress,
    options.city
  );
  const variants = buildAddressVariants(
    options.lockedDisplayAddress,
    publicAddress,
    options.city
  );

  let value = normalizeAddressesInText(text, variants, publicAddress);
  if (options.stripLeading) {
    value = stripLeadingAddressPhrase(value, variants);
  }
  value = limitAddressMentions(
    value,
    options.lockedDisplayAddress,
    2,
    options.budget,
    options.city
  );
  value = fixAwkwardPropertyCityPhrasing(value, options.city);
  return collapseDuplicateCityPhrasing(value, options.city);
}

export function reduceSellerReportAddressRepetition(
  report: SellerAiReport,
  lockedDisplayAddress: string,
  city: string
): SellerAiReport {
  const budget: AddressMentionBudget = { remaining: 2 };

  const polish = (text: string, stripLeading: boolean) =>
    polishSellerText(text, {
      lockedDisplayAddress,
      city,
      stripLeading,
      budget,
    });

  return {
    ...report,
    summary: polish(report.summary, false),
    sellerStrategy: polish(report.sellerStrategy, false),
    positioningAngle: polish(report.positioningAngle, false),
    prepRecommendations: report.prepRecommendations.map((item) =>
      polish(item, true)
    ),
    questionsForJustin: report.questionsForJustin.map((item) =>
      polish(item, true)
    ),
    recommendedNextStep: polish(report.recommendedNextStep, false),
    suggestedFollowUpMessage: polish(report.suggestedFollowUpMessage, false),
  };
}

export function postProcessSellerLeadConcierge(
  concierge: LeadConcierge,
  lockedDisplayAddress: string,
  city: string
): LeadConcierge {
  const budget: AddressMentionBudget = { remaining: 1 };

  const polish = (text: string, stripLeading: boolean) =>
    polishSellerText(text, {
      lockedDisplayAddress,
      city,
      stripLeading,
      budget,
    });

  return {
    leadPriorityReason: polish(concierge.leadPriorityReason, false),
    callOpener: polish(concierge.callOpener, false),
    smsFollowUp: polish(concierge.smsFollowUp, false),
    emailFollowUp: polish(concierge.emailFollowUp, false),
    objectionsToExpect: concierge.objectionsToExpect.map((item) =>
      polish(item, true)
    ),
    recommendedFollowUpTimeline: polish(
      concierge.recommendedFollowUpTimeline,
      false
    ),
    nextBestAction: polish(concierge.nextBestAction, false),
  };
}

export function countAddressMentionsInText(
  text: string,
  lockedDisplayAddress: string,
  city?: string
): number {
  const publicAddress = formatPublicAddress(lockedDisplayAddress, city);
  const patterns = buildAddressVariants(
    lockedDisplayAddress,
    publicAddress,
    city
  );
  let count = 0;
  for (const pattern of patterns) {
    const re = new RegExp(escapeRegex(pattern), "gi");
    count += (text.match(re) ?? []).length;
  }
  return count;
}

export function itemStartsWithAddressLeadIn(
  text: string,
  lockedDisplayAddress: string
): boolean {
  const variants = buildAddressVariants(lockedDisplayAddress);
  const trimmed = text.trim();
  for (const variant of variants) {
    const re = new RegExp(
      `^(?:For|At|Regarding)\\s+${escapeRegex(variant)}\\s*,`,
      "i"
    );
    if (re.test(trimmed)) return true;
  }
  return false;
}
