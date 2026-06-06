import {
  buildBuyerFollowUpMessage,
  buildSellerFollowUpMessage,
  getFollowUpGreeting,
  isRealFirstName,
  labelBudget,
  labelCondition,
  labelFinancing,
  labelSellerPriority,
  labelSellingTimeline,
  labelTimeline,
} from "@/lib/ai/report-labels";
import {
  buildEquityFollowUpMessage,
  formatGrossEquityPhrase,
} from "@/lib/ai/equity-report-labels";
import { buildWealthFollowUpMessage } from "@/lib/ai/wealth-report-labels";
import {
  EQUITY_CONCERN_LABELS,
  EQUITY_GOAL_LABELS,
  EQUITY_TIMELINE_LABELS,
  WEALTH_LEVERAGE_LABELS,
  WEALTH_LIQUIDITY_LABELS,
  WEALTH_PROPERTY_USE_LABELS,
  WEALTH_TIMELINE_LABELS,
} from "@/lib/constants";
import {
  calculateEquityMove,
  formatCurrency,
  type EquityCalculations,
} from "@/lib/equity/calculateEquityMove";
import {
  calculateWealthForecast,
  type WealthForecastCalculations,
} from "@/lib/wealth/calculateWealthForecast";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import type { LeadTemperature } from "@/lib/scoring";
import { isPremiumSellerValue } from "@/lib/seller/seller-tier";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export type LeadConciergeLeadType =
  | "buyer"
  | "seller"
  | "equity"
  | "wealth_forecast";

export interface LeadConciergeInput {
  leadType: LeadConciergeLeadType;
  quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData;
  leadScore: number;
  leadTemperature: LeadTemperature;
  internalLeadSummary?: string;
  equityCalculations?: EquityCalculations;
  equityPropertyIntelligence?: import("@/lib/property/equityPropertyTypes").EquityPropertyIntelligence | null;
  wealthCalculations?: WealthForecastCalculations;
}

function followUpTimelineForTemperature(temp: LeadTemperature): string {
  if (temp === "hot") return "Reach out within 24 hours while intent is highest.";
  if (temp === "warm") return "Follow up within 48–72 hours with a concrete next step.";
  return "Follow up within one week with a low-pressure planning check-in.";
}

function smsFromEmail(email: string): string {
  const trimmed = email.trim();
  if (trimmed.length <= 320) return trimmed;
  return `${trimmed.slice(0, 300).trim()}…`;
}

function smsGreeting(firstName: string): string {
  return isRealFirstName(firstName)
    ? `Hi ${firstName.trim()},`
    : "Hi there,";
}

function buildBuyerConcierge(input: LeadConciergeInput): LeadConcierge {
  const tenant = getDefaultTenant();
  const data = input.quizData as BuyerQuizData;
  const location = data.desiredLocations.join(", ");
  const budget = labelBudget(data.budgetRange);
  const timeline = labelTimeline(data.timeline);
  const financing = labelFinancing(data.financingStatus);
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const emailFollowUp = buildBuyerFollowUpMessage(data);

  return {
    leadPriorityReason: `${input.leadTemperature.toUpperCase()} buyer lead (${input.leadScore}/100): ${location} ${data.propertyType} around ${budget} on a ${timeline.toLowerCase()} timeline with ${financing}.`,
    callOpener: `${greeting.replace(/,$/, "")} — this is ${tenant.agentName} with ${tenant.brandName}. I reviewed your private client brief for ${location}. You are targeting a ${data.propertyType} around ${budget} on a ${timeline.toLowerCase()} timeline. I would love to pressure test the right communities and tradeoffs with you.`,
    smsFollowUp: smsFromEmail(
      `${smsGreeting(data.contact.firstName)} ${tenant.agentName} here. I reviewed your ${location} ${data.propertyType} search (${budget}, ${timeline.toLowerCase()} timeline). Happy to send a curated shortlist and talk tradeoffs when you have 10 minutes.`
    ),
    emailFollowUp,
    objectionsToExpect: [
      "Inventory feels limited in their top locations",
      "HOA vs location vs interior space tradeoffs",
      "Whether their budget supports newer construction in target areas",
      "Timing vs financing readiness",
    ],
    recommendedFollowUpTimeline: followUpTimelineForTemperature(
      input.leadTemperature
    ),
    nextBestAction:
      "Send a curated shortlist outline for their top location and offer a 20-minute call to compare budget, property type, and timing tradeoffs.",
  };
}

function buildSellerConcierge(input: LeadConciergeInput): LeadConcierge {
  const tenant = getDefaultTenant();
  const data = input.quizData as SellerQuizData;
  const city = data.propertyAddress.city;
  const value = labelBudget(data.estimatedValueRange);
  const timeline = labelSellingTimeline(data.sellingTimeline);
  const priority = labelSellerPriority(data.sellerPriority);
  const condition = labelCondition(data.propertyCondition);
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const emailFollowUp = buildSellerFollowUpMessage(data);
  const isPremium = isPremiumSellerValue(data.estimatedValueRange);

  if (isPremium) {
    return {
      leadPriorityReason: `${input.leadTemperature.toUpperCase()} premium seller (${input.leadScore}/100): ${condition} ${city} property in the ${value} range, ${timeline.toLowerCase()} timeline, priority on ${priority.toLowerCase()}. High discretion and presentation standards expected.`,
      callOpener: `${greeting.replace(/,$/, "")} — ${tenant.agentName} with ${tenant.brandName}. I reviewed your private seller strategy for ${city}. Before we discuss price, I would like to walk through launch sequence, showing privacy, and which property facts should shape the presentation narrative.`,
      smsFollowUp: smsFromEmail(
        `${smsGreeting(data.contact.firstName)} ${tenant.agentName}, ${tenant.brandName}. I reviewed your ${city} seller strategy (${value}). Open to a confidential call on launch sequence and presentation before any pricing conversation?`
      ),
      emailFollowUp,
      objectionsToExpect: [
        "Reluctance to discuss price before presentation and privacy plan are defined",
        "Concern about marketing footprint or neighbor awareness",
        "Whether broker to broker previews should precede any public marketing",
        "Timing vs waiting for the right qualified buyer",
        "How upgrades and architectural details will be documented for buyers",
      ],
      recommendedFollowUpTimeline: followUpTimelineForTemperature(
        input.leadTemperature
      ),
      nextBestAction:
        "Schedule a confidential strategy review: verify feature inventory, photo/showing privacy requirements, and questions to ask before discussing price.",
    };
  }

  return {
    leadPriorityReason: `${input.leadTemperature.toUpperCase()} seller lead (${input.leadScore}/100): ${condition} ${city} property in the ${value} range, ${timeline.toLowerCase()} timeline, priority on ${priority.toLowerCase()}.`,
    callOpener: `${greeting.replace(/,$/, "")} — ${tenant.agentName} with ${tenant.brandName}. I reviewed your seller strategy for your ${city} home (${value}, ${timeline.toLowerCase()} timeline). I would like to walk through presentation, timing, and a discreet go-to-market sequence.`,
    smsFollowUp: smsFromEmail(
      `${smsGreeting(data.contact.firstName)} ${tenant.agentName.split(" ")[0] ?? tenant.agentName} here. I reviewed your ${city} seller plan (${value}, ${timeline.toLowerCase()} timeline). I can share prep and launch sequencing ideas — open to a quick call?`
    ),
    emailFollowUp,
    objectionsToExpect: [
      "Concern about pricing too high or leaving money on the table",
      "Privacy during showings or marketing exposure",
      "Whether to prep before listing vs launch now",
      "Timeline pressure vs waiting for the right offer",
    ],
    recommendedFollowUpTimeline: followUpTimelineForTemperature(
      input.leadTemperature
    ),
    nextBestAction:
      "Offer a presentation and timing review and discuss whether limited exposure fits their motivation.",
  };
}

function buildEquityConcierge(input: LeadConciergeInput): LeadConcierge {
  const tenant = getDefaultTenant();
  const data = input.quizData as EquityQuizData;
  const calcs = input.equityCalculations ?? calculateEquityMove(data);
  const grossPhrase =
    calcs.grossEquity != null
      ? formatGrossEquityPhrase(calcs.grossEquity)
      : "estimated gross equity";
  const goal = EQUITY_GOAL_LABELS[data.nextMoveGoal];
  const timeline = EQUITY_TIMELINE_LABELS[data.timeline];
  const concern = EQUITY_CONCERN_LABELS[data.biggestConcern];
  const netLow =
    calcs.estimatedNetBeforeTaxLow != null
      ? formatCurrency(calcs.estimatedNetBeforeTaxLow)
      : "lower planning range";
  const netHigh =
    calcs.estimatedNetBeforeTaxHigh != null
      ? formatCurrency(calcs.estimatedNetBeforeTaxHigh)
      : "upper planning range";
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const emailFollowUp = buildEquityFollowUpMessage(data, calcs);

  return {
    leadPriorityReason: `${input.leadTemperature.toUpperCase()} equity lead (${input.leadScore}/100): ${data.currentHomeCity}, ${grossPhrase}, ${calcs.ownershipYears ?? "several"} years owned, goal to ${goal.toLowerCase()} on ${timeline.toLowerCase()} timeline. Main concern: ${concern.toLowerCase()}.`,
    callOpener: `${greeting.replace(/,$/, "")} — ${tenant.agentName} with ${tenant.brandName}. I reviewed your equity plan for ${data.currentHomeCity} with ${grossPhrase}. Your next move is ${goal.toLowerCase()} on a ${timeline.toLowerCase()} timeline, and I would like to pressure test net proceeds (${netLow}–${netHigh}) and sale-to-buy sequencing.`,
    smsFollowUp: smsFromEmail(
      `${smsGreeting(data.contact.firstName)} ${tenant.agentName.split(" ")[0] ?? tenant.agentName} here. I reviewed your ${data.currentHomeCity} equity scenario (${grossPhrase}). Happy to walk through net proceeds and timing for your ${goal.toLowerCase()} goal.`
    ),
    emailFollowUp,
    objectionsToExpect: [
      concern,
      "Uncertainty about net proceeds after selling costs",
      "Timing the sale vs the next purchase",
      "Tax planning questions (CPA coordination)",
    ],
    recommendedFollowUpTimeline: followUpTimelineForTemperature(
      input.leadTemperature
    ),
    nextBestAction:
      "Schedule a scenario review covering net proceeds range, sale/buy sequence options, and what to confirm with a CPA before acting.",
  };
}

function buildWealthConcierge(input: LeadConciergeInput): LeadConcierge {
  const tenant = getDefaultTenant();
  const data = input.quizData as WealthQuizData;
  const calcs = input.wealthCalculations ?? calculateWealthForecast(data);
  const locations = data.targetLocations.join(", ");
  const use = WEALTH_PROPERTY_USE_LABELS[data.propertyUse];
  const liquidity = WEALTH_LIQUIDITY_LABELS[data.liquiditySituation];
  const leverage = WEALTH_LEVERAGE_LABELS[data.leveragePreference];
  const timeline = WEALTH_TIMELINE_LABELS[data.timeline];
  const price =
    calcs.purchasePrice != null
      ? formatCurrency(calcs.purchasePrice)
      : "target purchase";
  const carry =
    calcs.estimatedMonthlyCarry != null
      ? formatCurrency(calcs.estimatedMonthlyCarry)
      : "modeled carry";
  const greeting = getFollowUpGreeting(data.contact.firstName);
  const emailFollowUp = buildWealthFollowUpMessage(data, calcs);

  return {
    leadPriorityReason: `${input.leadTemperature.toUpperCase()} wealth forecast lead (${input.leadScore}/100): ${price} in ${locations}, ${use.toLowerCase()}, ${liquidity.toLowerCase()}, ${leverage.toLowerCase()}, est. carry ${carry}/mo, ${timeline.toLowerCase()} timeline.`,
    callOpener: `${greeting.replace(/,$/, "")} — ${tenant.agentName} with ${tenant.brandName}. I reviewed your wealth forecast for ${price} in ${locations} (${use.toLowerCase()}). I would like to pressure test leverage, monthly carry near ${carry}, and whether lender and CPA coordination should happen next.`,
    smsFollowUp: smsFromEmail(
      `${smsGreeting(data.contact.firstName)} ${tenant.agentName.split(" ")[0] ?? tenant.agentName} here. I reviewed your ${locations} purchase scenario (${price}, ~${carry}/mo carry). Open to a quick call on leverage and next steps with your lender/CPA?`
    ),
    emailFollowUp,
    objectionsToExpect: [
      "Monthly carry higher than expected",
      "Whether to preserve cash vs use more leverage",
      "Property use and tax topics needing CPA review",
      "Timeline vs liquidity event timing",
    ],
    recommendedFollowUpTimeline: followUpTimelineForTemperature(
      input.leadTemperature
    ),
    nextBestAction:
      "Review the forecast assumptions together, introduce lender pressure test on rate/carry, and identify CPA topics based on property use.",
  };
}

export function buildLeadConciergeFallback(
  input: LeadConciergeInput
): LeadConcierge {
  switch (input.leadType) {
    case "buyer":
      return buildBuyerConcierge(input);
    case "seller":
      return buildSellerConcierge(input);
    case "equity":
      return buildEquityConcierge(input);
    case "wealth_forecast":
      return buildWealthConcierge(input);
  }
}
