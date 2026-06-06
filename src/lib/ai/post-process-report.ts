import {
  buildBuyerFollowUpMessage,
  buildBuyerReportTitle,
  buildSellerFollowUpMessage,
  buildSellerReportTitle,
  BUYER_RECOMMENDED_NEXT_STEP,
  getBuyerFinancingFollowUpPhrase,
  getBuyerFinancingFollowUpPhraseWithoutTiming,
  getFollowUpGreeting,
  isRealFirstName,
  SELLER_PREMIUM_RECOMMENDED_NEXT_STEP,
  SELLER_RECOMMENDED_NEXT_STEP,
  stripPlaceholderNameFromProse,
} from "@/lib/ai/report-labels";
import type { BuyerAiReport, SellerAiReport } from "@/lib/schemas/ai-report";
import type { BuyerQuizData, SellerQuizData } from "@/lib/schemas/quiz";
import { isPremiumSellerValue } from "@/lib/seller/seller-tier";
import { getLockedDisplayAddress } from "@/lib/property/getLockedDisplayAddress";
import type { PropertyIntelligence } from "@/lib/property/types";
import {
  enforceLockedDisplayAddressOnReport,
} from "@/lib/seller/enforce-locked-display-address";
import { reduceSellerReportAddressRepetition } from "@/lib/seller/seller-address-phrasing";
import { enforceSellerPriorityConsistency } from "@/lib/seller/seller-priority-consistency";
import { reduceSellerReportRepetition } from "@/lib/seller/seller-report-phrasing";
import { sanitizeEnrichmentText } from "@/lib/seller/sanitize-enrichment-text";

const INVENTORY_CAVEAT_PATTERN =
  /inventory dependent|depends on inventory|inventory tradeoff|active inventory|inventory varies|pressure test|pressure-test/i;

type TextReplacer = {
  pattern: RegExp;
  replacement: string;
};

const GLOBAL_REPLACERS: TextReplacer[] = [
  { pattern: /\bbest neighborhoods\b/gi, replacement: "communities to prioritize" },
  { pattern: /\binvestment potential\b/gi, replacement: "resale considerations" },
  { pattern: /\bmaximize your outcome\b/gi, replacement: "strengthen your market position" },
  { pattern: /\bmaximize\b/gi, replacement: "strengthen" },
  { pattern: /\bdesirable locations\b/gi, replacement: "relevant buyer expectations" },
  { pattern: /\bdesirable location\b/gi, replacement: "location appeal" },
  { pattern: /\bneighborhood benefits\b/gi, replacement: "property and community tradeoffs" },
  { pattern: /\bbest fit\b/gi, replacement: "strongest alignment" },
  {
    pattern: /\bI hope this message finds you well\.?\s*/gi,
    replacement: "",
  },
  {
    pattern: /\bPlease let me know how you would like to proceed\.?\s*/gi,
    replacement: "",
  },
  { pattern: /\bYou are looking for\b/gi, replacement: "Your search profile points toward" },
  { pattern: /\bYou are seeking\b/gi, replacement: "Your search profile points toward" },
  { pattern: /\bYou are considering\b/gi, replacement: "Your search profile points toward" },
  { pattern: /\bThis area offers\b/gi, replacement: "Within this market, the main tradeoff to evaluate is" },
  { pattern: /\bunique coastal lifestyle\b/gi, replacement: "coastal ownership priorities" },
  { pattern: /\bguaranteed\b/gi, replacement: "projected" },
  { pattern: /\bperfect fit\b/gi, replacement: "strong alignment" },
  { pattern: /\bideal for you\b/gi, replacement: "aligned with your criteria" },
  { pattern: /\bis ideal\b/gi, replacement: "aligns well" },
  { pattern: /\bvibrant neighborhoods\b/gi, replacement: "active submarkets" },
  { pattern: /\bdream home\b/gi, replacement: "target property profile" },
  { pattern: /\bensure\b/gi, replacement: "confirm" },
  {
    pattern: /\bcurrent market dynamics\b/gi,
    replacement:
      "should be reviewed against the user's stated timing and preparation goals",
  },
  {
    pattern: /\bknown for its luxurious estates\b/gi,
    replacement: "has inventory patterns that may support estate searches",
  },
  {
    pattern: /\bknown for its\b/gi,
    replacement: "has inventory patterns that may support searches in",
  },
  {
    pattern: /\brich artistic community\b/gi,
    replacement:
      "should be evaluated by property condition, location, privacy, views, and timing",
  },
  {
    pattern: /\bbeautiful coastal estates\b/gi,
    replacement:
      "requires careful comparison of privacy, architecture, access, and resale considerations",
  },
  {
    pattern: /\bstunning views\b/gi,
    replacement: "view-oriented inventory tradeoffs",
  },
  {
    pattern: /\bstunning coastal views\b/gi,
    replacement: "view-oriented inventory tradeoffs",
  },
  {
    pattern: /\bis known for\b/gi,
    replacement: "has inventory patterns that may support",
  },
  { pattern: /\bdesirable ocean views\b/gi, replacement: "view-oriented inventory tradeoffs" },
];

const COMPLIANCE_REPLACERS: TextReplacer[] = [
  { pattern: /\bschool district\b/gi, replacement: "community amenities" },
  { pattern: /\bschools\b/gi, replacement: "community amenities" },
  { pattern: /\bcrime rate\b/gi, replacement: "area characteristics" },
  { pattern: /\bsafe neighborhood\b/gi, replacement: "property location" },
  { pattern: /\bfamily-friendly\b/gi, replacement: "lifestyle-oriented" },
  { pattern: /\bbest for families\b/gi, replacement: "suited to your stated priorities" },
  { pattern: /\bMLS\b/gi, replacement: "market" },
  { pattern: /\bIDX\b/gi, replacement: "market" },
];

function applyReplacers(text: string, replacers: TextReplacer[]): string {
  let result = text;
  for (const { pattern, replacement } of replacers) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function sanitizeText(text: string, city?: string): string {
  let result = applyReplacers(text.trim(), [...GLOBAL_REPLACERS, ...COMPLIANCE_REPLACERS]);

  if (city) {
    result = result.replace(
      /\brelevant buyer expectations\b/gi,
      `relevant ${city} buyer expectations`
    );
    result = result.replace(/\blocation appeal\b/gi, `${city} location appeal`);
  }

  return result.replace(/\s{2,}/g, " ").trim();
}

function sanitizeSellerText(text: string, city?: string): string {
  return sanitizeEnrichmentText(sanitizeText(text, city));
}

function sanitizeStringArray(items: string[], city?: string): string[] {
  return items.map((item) => sanitizeText(item, city));
}

function applyBuyerFinancingPhrase(text: string, data: BuyerQuizData): string {
  const phrase = getBuyerFinancingFollowUpPhrase(data.financingStatus);
  const phraseNoTiming = getBuyerFinancingFollowUpPhraseWithoutTiming(
    data.financingStatus
  );
  const usePhrase =
    /\btimeline\b/i.test(text) && phrase.includes("and timing")
      ? phraseNoTiming
      : phrase;

  if (text.includes(usePhrase)) {
    return collapseRepeatedFinancingPhrases(text, usePhrase);
  }

  const result = text.replace(/\bfinancing path\b/gi, usePhrase);
  return collapseRepeatedFinancingPhrases(result, usePhrase);
}

function collapseRepeatedFinancingPhrases(
  text: string,
  phrase: string
): string {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.replace(new RegExp(`(${escaped})(?:,\\s*${escaped})+`, "gi"), phrase);
}

function sanitizeBuyerFollowUp(
  firstName: string,
  message: string,
  data: BuyerQuizData,
  city?: string
): string {
  const useBuiltMessage = !isRealFirstName(firstName);
  let result = useBuiltMessage ? message : sanitizeText(message, city);

  if (!useBuiltMessage) {
    result = applyBuyerFinancingPhrase(result, data);
  }

  result = result.replace(/^Hi[^,]*,/i, getFollowUpGreeting(firstName));
  result = result.replace(/\b(\d+)[–-](\d+)\s+months\b/gi, "$1–$2 month");
  return result;
}

function sanitizeSellerFollowUp(
  firstName: string,
  message: string,
  _data: SellerQuizData,
  city?: string
): string {
  let result = sanitizeSellerText(message, city);

  result = result.replace(
    /Based on your ([A-Za-z\s]+) property,\s*([^,]+),\s*and\s+([\d–\-]+ (?:months?|days?)[^,.]*)/gi,
    (_match, cityPart: string, conditionPart: string, timelinePart: string) => {
      const timeline = timelinePart.replace(/\bmonths\b/i, "month").replace(/\bdays\b/i, "day");
      return `Based on your ${conditionPart.trim()} ${cityPart.trim()} property and ${timeline}`;
    }
  );

  result = result.replace(/\b(\d+)[–-](\d+)\s+months\b/gi, "$1–$2 month");
  result = result.replace(/^Hi[^,]*,/i, getFollowUpGreeting(firstName));
  return result;
}

function dedupeBestFitAreas(
  areas: BuyerAiReport["bestFitAreas"],
  desiredLocations: BuyerQuizData["desiredLocations"]
): BuyerAiReport["bestFitAreas"] {
  const seen = new Set<string>();
  const deduped: BuyerAiReport["bestFitAreas"] = [];

  for (const entry of areas) {
    const key = entry.area.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
  }

  if (desiredLocations.length === 1) {
    const only = desiredLocations[0]!;
    const match =
      deduped.find((a) => a.area.trim().toLowerCase() === only.toLowerCase()) ??
      deduped[0];
    return match ? [{ ...match, area: only }] : [{ area: only, reason: "", fitScore: 70 }];
  }

  return deduped.slice(0, 4);
}

function clampBudgetRating(
  rating: "strong" | "moderate" | "challenging",
  explanation: string
): "strong" | "moderate" | "challenging" {
  if (rating === "strong" && !INVENTORY_CAVEAT_PATTERN.test(explanation)) {
    return "moderate";
  }
  return rating;
}

export function postProcessBuyerReport(
  report: BuyerAiReport,
  data: BuyerQuizData
): BuyerAiReport {
  const city = data.desiredLocations[0];
  const followUpSource = isRealFirstName(data.contact.firstName)
    ? report.suggestedFollowUpMessage
    : buildBuyerFollowUpMessage(data);

  const firstName = data.contact.firstName;

  return {
    ...report,
    reportTitle: buildBuyerReportTitle(firstName),
    summary: stripPlaceholderNameFromProse(
      applyBuyerFinancingPhrase(sanitizeText(report.summary, city), data),
      firstName
    ),
    bestFitAreas: dedupeBestFitAreas(
      report.bestFitAreas.map((area) => ({
        ...area,
        area: data.desiredLocations.includes(
          area.area as (typeof data.desiredLocations)[number]
        )
          ? area.area
          : (city ?? area.area),
        reason: sanitizeText(area.reason, city),
      })),
      data.desiredLocations
    ),
    budgetFit: {
      rating: clampBudgetRating(report.budgetFit.rating, report.budgetFit.explanation),
      explanation: sanitizeText(report.budgetFit.explanation, city),
    },
    propertyRecommendation: applyBuyerFinancingPhrase(
      sanitizeText(report.propertyRecommendation, city),
      data
    ),
    recommendedNextStep: BUYER_RECOMMENDED_NEXT_STEP,
    questionsForJustin: sanitizeStringArray(report.questionsForJustin, city),
    internalLeadSummary: sanitizeText(report.internalLeadSummary, city),
    suggestedFollowUpMessage: stripPlaceholderNameFromProse(
      sanitizeBuyerFollowUp(firstName, followUpSource, data, city),
      firstName
    ),
  };
}

export function postProcessSellerReport(
  report: SellerAiReport,
  data: SellerQuizData,
  propertyIntelligence?: PropertyIntelligence | null
): SellerAiReport {
  const locked = getLockedDisplayAddress(
    data.propertyAddress,
    propertyIntelligence
  );
  const city = data.propertyAddress.city;
  const followUpSource = isRealFirstName(data.contact.firstName)
    ? report.suggestedFollowUpMessage
    : buildSellerFollowUpMessage(data);

  const processed: SellerAiReport = {
    ...report,
    reportTitle: buildSellerReportTitle(data.contact.firstName),
    summary: sanitizeSellerText(report.summary, city),
    sellerStrategy: sanitizeSellerText(report.sellerStrategy, city),
    positioningAngle: sanitizeSellerText(report.positioningAngle, city),
    prepRecommendations: report.prepRecommendations.map((item) =>
      sanitizeSellerText(item, city)
    ),
    recommendedNextStep: isPremiumSellerValue(data.estimatedValueRange)
      ? SELLER_PREMIUM_RECOMMENDED_NEXT_STEP
      : SELLER_RECOMMENDED_NEXT_STEP,
    questionsForJustin: report.questionsForJustin.map((item) =>
      sanitizeSellerText(item, city)
    ),
    internalLeadSummary: sanitizeText(report.internalLeadSummary, city),
    suggestedFollowUpMessage: sanitizeSellerFollowUp(
      data.contact.firstName,
      followUpSource,
      data,
      city
    ),
  };

  const deduped = reduceSellerReportRepetition(processed);
  const priorityAligned = enforceSellerPriorityConsistency(deduped, data);
  const addressLocked = enforceLockedDisplayAddressOnReport(
    priorityAligned,
    locked.lockedDisplayAddress
  );
  const phrasingPolished = reduceSellerReportAddressRepetition(
    addressLocked,
    locked.lockedDisplayAddress,
    city
  );
  return {
    ...phrasingPolished,
    summary: sanitizeEnrichmentText(phrasingPolished.summary),
    sellerStrategy: sanitizeEnrichmentText(phrasingPolished.sellerStrategy),
    positioningAngle: sanitizeEnrichmentText(phrasingPolished.positioningAngle),
    prepRecommendations: phrasingPolished.prepRecommendations.map(
      sanitizeEnrichmentText
    ),
    questionsForJustin: phrasingPolished.questionsForJustin.map(
      sanitizeEnrichmentText
    ),
    suggestedFollowUpMessage: sanitizeEnrichmentText(
      phrasingPolished.suggestedFollowUpMessage
    ),
  };
}

export function postProcessReport(
  data: BuyerQuizData | SellerQuizData,
  report: BuyerAiReport | SellerAiReport
): BuyerAiReport | SellerAiReport {
  if (data.leadType === "buyer") {
    return postProcessBuyerReport(report as BuyerAiReport, data);
  }
  return postProcessSellerReport(report as SellerAiReport, data, undefined);
}

export function containsBannedPhrase(text: string): string[] {
  const banned = [
    "best neighborhoods",
    "investment potential",
    "maximize your outcome",
    "maximize",
    "desirable locations",
    "current market dynamics",
    "known for its luxurious estates",
    "stunning views",
    "financing path",
    "I hope this message finds you well",
    "perfect fit",
    "guaranteed",
    "schools",
    "family-friendly",
  ];
  const lower = text.toLowerCase();
  return banned.filter((phrase) => lower.includes(phrase));
}
