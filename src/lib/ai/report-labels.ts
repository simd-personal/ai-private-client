import {
  BUDGET_LABELS,
  BUDGET_RANGES,
  TIMELINE_LABELS,
} from "@/lib/constants";
import type { BuyerQuizData, SellerQuizData } from "@/lib/schemas/quiz";
import { sanitizeEnrichmentText } from "@/lib/seller/sanitize-enrichment-text";
import { getSellerPriorityPublicLabel } from "@/lib/seller/seller-priority-consistency";
import { isPremiumSellerValue } from "@/lib/seller/seller-tier";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
} from "@/lib/tenants/tenant-config";

export type ReportSource = "openai" | "fallback";

const PLACEHOLDER_NAME_PATTERN =
  /^(fixture|test|example|demo|sample|mock|placeholder)/i;

export function isRealFirstName(name: string): boolean {
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  return !PLACEHOLDER_NAME_PATTERN.test(trimmed);
}

/** Replace common wealth-forecast copy typo from model output. */
export function fixWealthFollowUpTypo(text: string): string {
  return text
    .replace(/\bpressure the model\b/gi, "pressure test the model")
    .replace(/\bwhile pressure test\b/gi, "while we pressure test")
    .replace(/\bwhile pressure-testing\b/gi, "while we pressure-test");
}

/** Remove placeholder first names from customer-facing prose. */
export function stripPlaceholderNameFromProse(
  text: string,
  firstName: string
): string {
  if (isRealFirstName(firstName)) return text;

  const escaped = firstName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    escaped.length > 0 ? new RegExp(`\\b${escaped}\\b`, "gi") : null,
    /\bFixture\b/gi,
    /\bHi\s+(?:Fixture|Test|Example|Demo|Sample)\b/gi,
    /\bDear\s+(?:Fixture|Test|Example|Demo|Sample)\b/gi,
    /\bfor you,\s*/gi,
  ].filter((p): p is RegExp => p != null);

  let result = text;
  for (const pattern of patterns) {
    result = result.replace(pattern, "");
  }

  return result
    .replace(/\s{2,}/g, " ")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .trim();
}

/** Sanitize concierge/admin copy when firstName is a placeholder or empty. */
export function sanitizeConciergeProse(text: string, firstName: string): string {
  let result = text;

  if (!isRealFirstName(firstName)) {
    result = stripPlaceholderNameFromProse(result, firstName);
    result = result
      .replace(/\bHi\s*,\s*/gi, "Hi there, ")
      .replace(/\bHi\s+there\s*,?\s*there\b/gi, "Hi there,")
      .replace(/\bDear\s*,\s*/gi, "Hi there, ")
      .replace(/^\s*Email\s+first\b/gi, "Send a personalized email first")
      .replace(/\bEmail\s+a\b/gi, "Send a");
  }

  return sanitizeEnrichmentText(
    fixWealthFollowUpTypo(
      result
        .replace(/\s{2,}/g, " ")
        .replace(/,\s*,/g, ",")
        .trim()
    )
  );
}

export function getFollowUpGreeting(firstName: string): string {
  return isRealFirstName(firstName) ? `Hi ${firstName.trim()},` : "Hi there,";
}

export function buildBuyerReportTitle(
  firstName: string,
  tenant = getDefaultTenant()
): string {
  return isRealFirstName(firstName)
    ? `Your Private Client Brief, ${firstName.trim()}`
    : `Your Private ${getTenantSupportedRegionLabel(tenant)} Client Brief`;
}

export function buildSellerReportTitle(
  firstName: string,
  tenant = getDefaultTenant()
): string {
  return isRealFirstName(firstName)
    ? `Your Private Seller Strategy Plan, ${firstName.trim()}`
    : `Your Private ${getTenantSupportedRegionLabel(tenant)} Seller Strategy Plan`;
}

export function getBuyerRecommendedNextStep(
  tenant = getDefaultTenant()
): string {
  return `The next step is to review a curated shortlist with ${tenant.agentName} and compare each option against budget, property type, timing, and the main tradeoffs.`;
}

export const BUYER_RECOMMENDED_NEXT_STEP = getBuyerRecommendedNextStep();

export const SELLER_RECOMMENDED_NEXT_STEP =
  "The next step is to review pricing leverage, property presentation, and whether private market testing should happen before public exposure.";

export function getSellerPremiumRecommendedNextStep(
  tenant = getDefaultTenant()
): string {
  return `The next step is a confidential strategy review with ${tenant.agentName} to align launch sequence, presentation standards, and discretion requirements before any broader market exposure.`;
}

export const SELLER_PREMIUM_RECOMMENDED_NEXT_STEP =
  getSellerPremiumRecommendedNextStep();

export function getBuyerFinancingFollowUpPhraseWithoutTiming(
  status: BuyerQuizData["financingStatus"]
): string {
  return getBuyerFinancingFollowUpPhrase(status).replace(
    /,?\s*and timing\b/gi,
    ""
  );
}

export function getBuyerFinancingFollowUpPhrase(
  status: BuyerQuizData["financingStatus"]
): string {
  switch (status) {
    case "cash buyer":
      return "offer strategy, proof of funds, and timing";
    case "pre approved":
      return "approval strength, offer strategy, and timing";
    case "talking to lender":
    case "needs lender referral":
      return "financing path, offer strategy, and timing";
    case "just exploring":
      return "readiness, timing, and search strategy";
    default:
      return "financing path, offer strategy, and timing";
  }
}

export function formatFollowUpTimeline(
  timeline: SellerQuizData["sellingTimeline"]
): string {
  return labelSellingTimeline(timeline)
    .replace(/\bmonths\b/i, "month")
    .replace(/\bdays\b/i, "day")
    .toLowerCase();
}

export function formatFollowUpCondition(
  condition: SellerQuizData["propertyCondition"]
): string {
  const labeled = labelCondition(condition);
  if (labeled === "average condition") return "average-condition";
  return labeled;
}

export function buildBuyerFollowUpMessage(
  data: BuyerQuizData,
  tenant = getDefaultTenant()
): string {
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const location = data.desiredLocations[0] ?? "your selected market";
  const budget = labelBudget(data.budgetRange);
  const property = data.propertyType;
  const timeline = labelTimeline(data.timeline).toLowerCase();
  const financePhrase = getBuyerFinancingFollowUpPhraseWithoutTiming(
    data.financingStatus
  );

  return `${greeting} I reviewed your private client brief. Based on your ${location} ${property} search around ${budget}, the next step is to narrow the right communities and pressure test current inventory against your ${timeline} timeline. I can prepare a curated shortlist and walk you through the main tradeoffs around location, HOA structure, and ${financePhrase} with ${tenant.agentName}.`;
}

export function buildSellerFollowUpMessage(
  data: SellerQuizData,
  tenant = getDefaultTenant()
): string {
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const city = data.propertyAddress.city;
  const condition = formatFollowUpCondition(data.propertyCondition);
  const timeline = formatFollowUpTimeline(data.sellingTimeline);

  if (isPremiumSellerValue(data.estimatedValueRange)) {
    return `${greeting} I reviewed your private seller strategy for ${city}. Based on your ${condition} property and ${timeline} timeline, the next step is a confidential review of launch sequence, presentation standards, and showing privacy before any broader market conversation with ${tenant.agentName}.`;
  }

  return `${greeting} I reviewed your seller strategy. Based on your ${condition} ${city} property and ${timeline} timeline, I would start with a presentation review and a discreet go-to-market sequence with ${tenant.agentName}.`;
}

export function formatList(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function labelBudget(range: (typeof BUDGET_RANGES)[number]): string {
  return BUDGET_LABELS[range] ?? range;
}

export function labelTimeline(timeline: keyof typeof TIMELINE_LABELS): string {
  return TIMELINE_LABELS[timeline] ?? timeline;
}

const FINANCING_LABELS: Record<BuyerQuizData["financingStatus"], string> = {
  "cash buyer": "cash buyer",
  "pre approved": "pre-approved",
  "talking to lender": "actively talking to a lender",
  "needs lender referral": "seeking a lender referral",
  "just exploring": "still exploring financing options",
};

export function labelFinancing(status: BuyerQuizData["financingStatus"]): string {
  return FINANCING_LABELS[status];
}

const SELLER_TIMELINE_LABELS: Record<SellerQuizData["sellingTimeline"], string> = {
  now: "Ready now",
  "30 to 90 days": "30–90 days",
  "3 to 6 months": "3–6 months",
  "6 to 12 months": "6–12 months",
  "testing the market": "Testing the market",
};

export function labelSellingTimeline(
  timeline: SellerQuizData["sellingTimeline"]
): string {
  return SELLER_TIMELINE_LABELS[timeline];
}

export function labelSellerPriority(
  priority: SellerQuizData["sellerPriority"]
): string {
  return getSellerPriorityPublicLabel(priority);
}

const CONDITION_LABELS: Record<SellerQuizData["propertyCondition"], string> = {
  "needs work": "needs work",
  average: "average condition",
  updated: "updated",
  "luxury renovated": "luxury renovated",
  "new construction": "new construction",
};

export function labelCondition(
  condition: SellerQuizData["propertyCondition"]
): string {
  return CONDITION_LABELS[condition];
}

const PRIORITY_TRADEOFFS: Partial<
  Record<BuyerQuizData["lifestylePriorities"][number], string>
> = {
  "ocean access":
    "Properties closer to the coast may trade interior square footage, lot size, or HOA flexibility for proximity and views.",
  privacy:
    "More private settings may mean longer commutes, fewer walkable amenities, or higher price per square foot.",
  walkability:
    "Walkable locations can carry higher HOA costs, smaller lot sizes, or more competition at similar price points.",
  "new construction":
    "Newer inventory may come with premium pricing, construction timelines, or Mello-Roos and HOA considerations.",
  views:
    "View-oriented homes may prioritize elevation or orientation over lot size, bedroom count, or flat usable yard space.",
  "large lot":
    "Larger lots often sit farther from core amenities or require more maintenance and landscaping investment.",
  "gated community":
    "Gated communities can add HOA rules, monthly dues, and buyer-pool constraints compared with non-gated options.",
  architecture:
    "Architecturally distinctive homes may be more limited in inventory and can require higher upkeep or customization budget.",
  commute:
    "Commute-focused searches may require balancing location convenience against lot size, privacy, or price per foot.",
  "investment upside":
    "Properties with upside potential may involve renovation scope, market timing considerations, or submarket-specific inventory cycles.",
};

export function areaFitReason(
  area: string,
  priorities: BuyerQuizData["lifestylePriorities"],
  tenant = getDefaultTenant()
): string {
  const primary = priorities.slice(0, 2).map(titleCase);
  const tradeoff = priorities
    .map((p) => PRIORITY_TRADEOFFS[p])
    .find(Boolean);

  let reason = `Your search profile points toward ${area} based on ownership priorities around ${formatList(primary.map((p) => p.toLowerCase()))}. Within ${area}, inventory varies by submarket, HOA profile, and property age — ${tenant.agentName} can help compare communities to prioritize against your criteria. The main tradeoff to evaluate is how location, condition, and HOA structure balance against active inventory.`;
  if (tradeoff) reason += ` ${tradeoff}`;
  return reason;
}

export function estimateBudgetRating(
  budgetRange: (typeof BUDGET_RANGES)[number],
  propertyType: BuyerQuizData["propertyType"]
): "strong" | "moderate" | "challenging" {
  const lowBudget =
    budgetRange === "under 1000000" || budgetRange === "1000000 to 1500000";
  const highDemandTypes = new Set(["estate", "single family", "new construction"]);

  if (lowBudget && highDemandTypes.has(propertyType)) return "challenging";
  return "moderate";
}

export function budgetFitExplanation(
  data: BuyerQuizData,
  areas: string[],
  tenant = getDefaultTenant()
): string {
  const budget = labelBudget(data.budgetRange);
  const areasText = formatList(areas);
  const property = titleCase(data.propertyType);

  return `This range should be pressure tested against ${areasText} for ${property.toLowerCase()} options at ${budget}. Your budget may be competitive for certain property types, but final fit is inventory dependent. Expect tradeoffs across location, condition, HOA structure, and offer terms. ${tenant.agentName} can clarify where your range is well positioned without implying access to live market data or a specific property value.`;
}

export function estimateBuyerReadiness(data: BuyerQuizData): number {
  let score = 45;
  if (data.timeline === "now" || data.timeline === "30 to 90 days") score += 20;
  if (data.financingStatus === "cash buyer" || data.financingStatus === "pre approved")
    score += 15;
  if (data.freeText?.trim()) score += 10;
  if (data.lifestylePriorities.length >= 2) score += 5;
  return Math.min(95, score);
}

export function estimateSellerReadiness(data: SellerQuizData): number {
  let score = 45;
  if (data.sellingTimeline === "now" || data.sellingTimeline === "30 to 90 days")
    score += 20;
  if (
    data.propertyCondition === "updated" ||
    data.propertyCondition === "luxury renovated" ||
    data.propertyCondition === "new construction"
  )
    score += 15;
  if (data.upgrades?.trim()) score += 10;
  if (data.sellerPriority === "highest price" || data.sellerPriority === "speed")
    score += 5;
  return Math.min(95, score);
}

export function logReportSource(
  leadType: "buyer" | "seller" | "equity",
  source: ReportSource
): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[report] ${leadType} report source: ${source}`);
  }
}
