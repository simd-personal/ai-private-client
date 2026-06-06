import type { BUDGET_RANGES } from "@/lib/constants";
import type { SellerQuizData } from "@/lib/schemas/quiz";

const PREMIUM_VALUE_RANGES = new Set<
  (typeof BUDGET_RANGES)[number]
>(["5000000 to 10000000", "10000000 plus"]);

const ULTRA_LUXURY_VALUE_RANGES = new Set<
  (typeof BUDGET_RANGES)[number]
>(["10000000 plus"]);

export function isPremiumSellerValue(
  estimatedValueRange: SellerQuizData["estimatedValueRange"]
): boolean {
  return PREMIUM_VALUE_RANGES.has(estimatedValueRange);
}

export function isUltraLuxurySellerValue(
  estimatedValueRange: SellerQuizData["estimatedValueRange"]
): boolean {
  return ULTRA_LUXURY_VALUE_RANGES.has(estimatedValueRange);
}

/** Public result page section title for positioning content. */
export function getSellerPositioningSectionTitle(
  estimatedValueRange: SellerQuizData["estimatedValueRange"]
): "Private Market Positioning" | "Market Positioning" {
  return isPremiumSellerValue(estimatedValueRange)
    ? "Private Market Positioning"
    : "Market Positioning";
}
