import {
  calculateBuyerLeadScore,
  calculateEquityLeadScore,
  calculateSellerLeadScore,
} from "@/lib/scoring";
import { calculateEquityMove } from "@/lib/equity/calculateEquityMove";
import type { EquityPropertyIntelligence } from "@/lib/property/equityPropertyTypes";
import { calculateWealthForecast } from "@/lib/wealth/calculateWealthForecast";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import { calculateWealthForecastLeadScore } from "@/lib/scoring";

export function buildModelSelectionForBuyer(data: BuyerQuizData) {
  return { leadScore: calculateBuyerLeadScore(data) };
}

export function buildModelSelectionForSeller(data: SellerQuizData) {
  return { leadScore: calculateSellerLeadScore(data) };
}

export function buildModelSelectionForEquity(
  data: EquityQuizData,
  equityPropertyIntelligence?: EquityPropertyIntelligence | null
) {
  const calculations = calculateEquityMove(data, {
    rentCastEstimatedValue: equityPropertyIntelligence?.estimatedValue,
  });
  return {
    leadScore: calculateEquityLeadScore(data, calculations),
    calculations,
  };
}

export function buildModelSelectionForWealthForecast(data: WealthQuizData) {
  const calculations = calculateWealthForecast(data);
  return {
    leadScore: calculateWealthForecastLeadScore(data, calculations),
    calculations,
  };
}
