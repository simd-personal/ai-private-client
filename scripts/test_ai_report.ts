/**
 * AI report prompt testing harness — no UI, no Supabase by default.
 *
 * Usage:
 *   npm run ai:test -- buyer.irvine.townhome
 *   npm run ai:test -- equity.irvine.owned10
 *   npm run ai:test -- seller.costa.mesa save
 */

import { config } from "dotenv";
import { readFileSync } from "fs";
import { join } from "path";
import { assertGpt5RequestOptionsCompliance } from "../src/lib/ai/buildOpenAIRequestOptions";
import { generateLeadConcierge } from "../src/lib/ai/generateLeadConcierge";
import { generateEquityReport } from "../src/lib/ai/generateEquityReport";
import { generateReport, generateSellerReport } from "../src/lib/ai/generateReport";
import { enrichEquityProperty } from "../src/lib/property/enrichEquityProperty";
import { formatEquityAddress } from "../src/lib/property/equityPropertyTypes";
import {
  getMiniBackupReportModel,
  getPremiumReportModel,
  getReportModelOrder,
} from "../src/lib/ai/selectReportModel";
import { labelBudget } from "../src/lib/ai/report-labels";
import {
  calculateEquityMove,
  formatCurrency,
} from "../src/lib/equity/calculateEquityMove";
import { calculateWealthForecast } from "../src/lib/wealth/calculateWealthForecast";
import { generateStrategyRoom } from "../src/lib/ai/generateStrategyRoom";
import { buildDecisionGraph } from "../src/lib/ai/buildDecisionGraph";
import { buildDataRoomSuggestions } from "../src/lib/ai/buildDataRoomSuggestions";
import { buildComplianceGuardrails } from "../src/lib/ai/buildComplianceGuardrails";
import {
  intakeContextFromPrivateClientDemo,
} from "../src/lib/ai/intake-context";
import { getLockedDisplayAddress } from "../src/lib/property/getLockedDisplayAddress";
import {
  countAddressMentionsInText,
  formatPublicAddress,
  itemStartsWithAddressLeadIn,
  publicAddressHasDuplicateCity,
} from "../src/lib/seller/seller-address-phrasing";
import { prepareSellerPropertyContext } from "../src/lib/property/prepareSellerPropertyContext";
import type { SellerPropertyContext } from "../src/lib/property/prepareSellerPropertyContext";
import { formatSellerAddress } from "../src/lib/property/types";
import type { LeadConcierge } from "../src/lib/schemas/lead-concierge";
import type {
  BuyerAiReport,
  EquityMoveReport,
  SellerAiReport,
  WealthForecastReport,
} from "../src/lib/schemas/ai-report";
import {
  buyerQuizSchema,
  equityQuizSchema,
  sellerQuizSchema,
  wealthForecastQuizSchema,
  type BuyerQuizData,
  type EquityQuizData,
  type SellerQuizData,
  type WealthQuizData,
} from "../src/lib/schemas/quiz";
import {
  calculateBuyerLeadScore,
  calculateEquityLeadScore,
  calculateSellerLeadScore,
  calculateWealthForecastLeadScore,
  getLeadTemperature,
} from "../src/lib/scoring";

config({ path: ".env.local" });
process.env.AI_TEST = "1";

const FIXTURES = [
  "buyer.irvine.townhome",
  "buyer.newport.luxury",
  "seller.costa.mesa",
  "seller.irvine.rich-property",
  "seller.newport.ultra-luxury",
  "seller.newport.swimmers-point",
  "equity.irvine.owned10",
  "equity.costa.mesa.moveup",
  "equity.newport.swimmers-point",
  "wealth.newport.founder",
  "wealth.investment.balanced",
  "private-client.demo",
] as const;

type FixtureName = (typeof FIXTURES)[number];

function loadFixture(
  name: string
): BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData | Record<string, unknown> {
  const path = join(process.cwd(), "scripts", "fixtures", `${name}.json`);
  const raw = JSON.parse(readFileSync(path, "utf-8")) as unknown;

  if (typeof raw === "object" && raw !== null && "leadType" in raw) {
    if (raw.leadType === "private_client_demo") {
      return raw as Record<string, unknown>;
    }
    if (raw.leadType === "buyer") return buyerQuizSchema.parse(raw);
    if (raw.leadType === "seller") return sellerQuizSchema.parse(raw);
    if (raw.leadType === "equity") return equityQuizSchema.parse(raw);
    if (raw.leadType === "wealth_forecast") {
      return wealthForecastQuizSchema.parse(raw);
    }
  }

  throw new Error(`Invalid fixture: ${name}`);
}

async function runPrivateClientDemoTest(
  fixtureName: string,
  raw: Record<string, unknown>
): Promise<void> {
  console.log("\n── Private Client Strategy Room Test ──");
  const ctx = intakeContextFromPrivateClientDemo(raw);
  console.log(`Objective:        ${ctx.objective}`);
  console.log(`Timeline:         ${ctx.timeline}`);
  console.log(`Privacy:          ${ctx.privacyLevel}`);

  const result = await generateStrategyRoom(ctx);
  const { output } = result;

  const decisionGraph = buildDecisionGraph(ctx, output);
  const dataRoomSuggestions = buildDataRoomSuggestions(ctx, output);
  const guardrails = buildComplianceGuardrails(output, decisionGraph);

  console.log(`\nAI source:        ${result.source}`);
  console.log(`Model succeeded:  ${result.model}`);
  console.log(`Readiness score:  ${output.dealReadiness.readinessScore}`);
  console.log(`Decision graph:   ${decisionGraph.graphTitle}`);
  console.log(`Decision stage:   ${decisionGraph.decisionStage}`);
  console.log(`Decision blockers:${decisionGraph.decisionBlockers.length}`);
  console.log(`Data room items:  ${dataRoomSuggestions.items.length}`);
  console.log(`Guardrails:       ${guardrails.overallStatus} (${guardrails.checks.length} checks)`);
  console.log(
    `Scenario titles:  ${output.scenarioComparison.scenarios.map((s) => s.title).join(" | ")}`
  );
  console.log(
    `Advisor map:      ${output.advisorCoordinationMap.advisors.map((a) => a.displayName).join(", ")}`
  );
  console.log(
    `Missing info:     ${output.redFlagsAndMissingInfo.missingInformation.length} items`
  );
  console.log(
    `Meeting prep Qs:  ${output.meetingPrepPack.discoveryQuestions.length} questions`
  );
  console.log(`White-glove SMS:  ${output.whiteGloveFollowUp.smsFollowUp.slice(0, 80)}…`);
  console.log(
    `Presentation:     ${output.presentationMode.slides.map((s) => s.title).join(" | ")}`
  );

  console.log(`\nFixture: ${fixtureName} — strategy room test complete`);
}

function printQuizContext(
  input: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): void {
  console.log(`Lead type:        ${input.leadType}`);
  if (input.leadType === "buyer") {
    console.log(`Locations:        ${input.desiredLocations.join(", ")}`);
    console.log(`Budget:           ${labelBudget(input.budgetRange)}`);
    console.log(`Property type:    ${input.propertyType}`);
    console.log(`Timeline:         ${input.timeline}`);
    console.log(`Financing:        ${input.financingStatus}`);
  } else if (input.leadType === "seller") {
    console.log(`City:             ${input.propertyAddress.city}`);
    console.log(`Estimated value:  ${labelBudget(input.estimatedValueRange)}`);
    console.log(`Condition:        ${input.propertyCondition}`);
    console.log(`Timeline:         ${input.sellingTimeline}`);
    console.log(`Priority:         ${input.sellerPriority}`);
    if (input.bedrooms != null) console.log(`Bedrooms:         ${input.bedrooms}`);
    if (input.propertyType) console.log(`Property type:    ${input.propertyType}`);
  } else if (input.leadType === "equity") {
    console.log(`City:             ${input.currentHomeCity}`);
    console.log(`Address:          ${formatEquityAddress(input.propertyAddress)}`);
    console.log(`Year purchased:   ${input.yearPurchased}`);
    console.log(
      `Current value:    ${
        input.estimatedCurrentValue != null
          ? formatCurrency(input.estimatedCurrentValue)
          : "not provided"
      }`
    );
    console.log(`Value source:     ${input.currentValueSource}`);
    console.log(`Mortgage:         ${formatCurrency(input.mortgageBalance)}`);
    console.log(`Next move:        ${input.nextMoveGoal}`);
    console.log(`Timeline:         ${input.timeline}`);
    console.log(`Concern:          ${input.biggestConcern}`);
  } else {
    console.log(`Purchase:         ${formatCurrency(input.purchasePrice)}`);
    console.log(`Locations:        ${input.targetLocations.join(", ")}`);
    console.log(`Property use:     ${input.propertyUse}`);
    console.log(`Hold period:      ${input.holdPeriodYears} years`);
    console.log(`Liquidity:        ${input.liquiditySituation}`);
    console.log(`Leverage:         ${input.leveragePreference}`);
    console.log(`Timeline:         ${input.timeline}`);
  }
}

function printModelRouting(): void {
  const [premiumModel, miniBackupModel] = getReportModelOrder();
  console.log("\n── Model routing ──");
  console.log(`Premium model:           ${premiumModel}`);
  console.log(`Mini backup model:       ${miniBackupModel}`);
  console.log(`Model order:             ${premiumModel} → ${miniBackupModel}`);
}

function printWealthCalculations(input: WealthQuizData): void {
  const calcs = calculateWealthForecast(input);
  console.log("\n── Wealth forecast calculations (deterministic) ──");
  console.log(`Purchase price:          ${calcs.purchasePrice != null ? formatCurrency(calcs.purchasePrice) : "n/a"}`);
  console.log(`Down payment:            ${calcs.downPaymentAmount != null ? formatCurrency(calcs.downPaymentAmount) : "n/a"}`);
  console.log(`Loan amount:             ${calcs.loanAmount != null ? formatCurrency(calcs.loanAmount) : "n/a"}`);
  console.log(`LTV:                     ${calcs.loanToValue != null ? `${calcs.loanToValue}%` : "n/a"}`);
  console.log(`Interest rate used:      ${calcs.interestRateUsed ?? "n/a"}${calcs.interestRateIsAssumption ? " (planning assumption)" : ""}`);
  console.log(`Monthly P&I:             ${calcs.monthlyPrincipalInterest != null ? formatCurrency(calcs.monthlyPrincipalInterest) : "n/a"}`);
  console.log(`Est. monthly carry:      ${calcs.estimatedMonthlyCarry != null ? formatCurrency(calcs.estimatedMonthlyCarry) : "n/a"}`);
  console.log(`Hold period:             ${calcs.holdPeriodYears ?? "n/a"} years`);
  console.log("\nScenario comparison:");
  console.log(`  Conservative (2%):  FV ${calcs.futureValueConservative != null ? formatCurrency(calcs.futureValueConservative) : "n/a"} | Equity ${calcs.equityConservative != null ? formatCurrency(calcs.equityConservative) : "n/a"} | Multiple ${calcs.equityMultipleConservative ?? "n/a"}`);
  console.log(`  Base (4%):          FV ${calcs.futureValueBase != null ? formatCurrency(calcs.futureValueBase) : "n/a"} | Equity ${calcs.equityBase != null ? formatCurrency(calcs.equityBase) : "n/a"} | Multiple ${calcs.equityMultipleBase ?? "n/a"}`);
  console.log(`  Upside (6%):        FV ${calcs.futureValueUpside != null ? formatCurrency(calcs.futureValueUpside) : "n/a"} | Equity ${calcs.equityUpside != null ? formatCurrency(calcs.equityUpside) : "n/a"} | Multiple ${calcs.equityMultipleUpside ?? "n/a"}`);
}

function printGenerationMeta(
  input: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData,
  result: Awaited<ReturnType<typeof generateReport>>
): void {
  const premiumModel = getPremiumReportModel();
  const miniBackupModel = getMiniBackupReportModel();
  const finalFallbackUsed = result.source === "fallback";

  console.log("\n── Generation meta ──");
  printQuizContext(input);
  console.log(`Premium model:           ${premiumModel}`);
  console.log(`Mini backup model:       ${miniBackupModel}`);
  console.log(`Succeeded model:         ${result.model}`);
  console.log(`Report source:           ${result.source}`);
  console.log(`Premium failed:          ${result.premiumModelFailed}`);
  console.log(`Mini backup attempted:   ${result.fallbackModelAttempted}`);
  console.log(`Final fallback used:     ${finalFallbackUsed}`);
  console.log(`Lead score:              ${result.leadScore}`);
  console.log(`Time taken:              ${result.durationMs} ms`);
  if (result.premiumModelFailedError) {
    console.log(`Premium error:           ${result.premiumModelFailedError}`);
  }
  if (result.miniBackupModelFailedError) {
    console.log(`Mini backup error:       ${result.miniBackupModelFailedError}`);
  }
  if (result.error) console.log(`Fallback reason:         ${result.error}`);
}

function printEquityPropertyEnrichment(
  input: EquityQuizData,
  intelligence: Awaited<ReturnType<typeof enrichEquityProperty>>
): void {
  const rentCastConfigured = isEnvConfigured("RENTCAST_API_KEY");
  const googleConfigured = isEnvConfigured("GOOGLE_MAPS_API_KEY");
  const rentCastReturned =
    intelligence.estimatedValue != null && intelligence.estimatedValue > 0;
  const calcs = calculateEquityMove(input, {
    rentCastEstimatedValue: intelligence.estimatedValue,
  });
  const usedValue = input.estimatedCurrentValue ?? null;
  const rentCastEstimate = intelligence.estimatedValue ?? null;

  console.log("\n════════════════════════════════════════");
  console.log("Equity property enrichment");
  console.log("════════════════════════════════════════");
  console.log(`RentCast configured:     ${rentCastConfigured}`);
  console.log(`Google Maps configured:  ${googleConfigured}`);
  console.log(`RentCast returned estimate: ${rentCastReturned ? "true" : "false"}`);
  console.log(`Comparable count:        ${intelligence.comparableCount}`);
  console.log(`Normalized address:      ${intelligence.normalizedAddress}`);
  console.log(
    `RentCast estimate:       ${
      rentCastEstimate != null ? formatCurrency(rentCastEstimate) : "n/a"
    }`
  );
  console.log(
    `Used planning value:     ${
      usedValue != null ? formatCurrency(usedValue) : "n/a"
    }`
  );
  console.log(`Current value source:    ${calcs.currentValueSource}`);
  if (
    rentCastEstimate != null &&
    usedValue != null &&
    Math.round(rentCastEstimate) !== Math.round(usedValue)
  ) {
    console.log(
      `Difference (used − AVM): ${formatCurrency(usedValue - rentCastEstimate)}`
    );
  }
  console.log(`Data sources:            ${intelligence.dataSources.join(", ") || "none"}`);
  console.log("");
}

function printEquityCalculations(
  input: EquityQuizData,
  intelligence?: Awaited<ReturnType<typeof enrichEquityProperty>> | null
): void {
  const calcs = calculateEquityMove(input, {
    rentCastEstimatedValue: intelligence?.estimatedValue,
  });
  console.log("\n── Equity calculations (deterministic) ──");
  console.log(`Current value source:      ${calcs.currentValueSource}`);
  console.log(`Ownership years:           ${calcs.ownershipYears ?? "n/a"}`);
  console.log(`Estimated appreciation:  ${calcs.estimatedAppreciation != null ? formatCurrency(calcs.estimatedAppreciation) : "n/a"}`);
  console.log(`Gross equity:            ${calcs.grossEquity != null ? formatCurrency(calcs.grossEquity) : "n/a"}`);
  console.log(`Selling costs:           ${calcs.sellingCostRange ?? "n/a"}`);
  console.log(`Net before tax (low):    ${calcs.estimatedNetBeforeTaxLow != null ? formatCurrency(calcs.estimatedNetBeforeTaxLow) : "n/a"}`);
  console.log(`Net before tax (high):   ${calcs.estimatedNetBeforeTaxHigh != null ? formatCurrency(calcs.estimatedNetBeforeTaxHigh) : "n/a"}`);
  console.log(`Capital gain estimate:   ${calcs.capitalGainEstimate != null ? formatCurrency(calcs.capitalGainEstimate) : "n/a"}`);
  console.log(`Exclusion (planning):    ${calcs.exclusionEstimate != null ? formatCurrency(calcs.exclusionEstimate) : "n/a"}`);
  console.log(`Potential taxable gain:  ${calcs.potentialTaxableGainEstimate != null ? formatCurrency(calcs.potentialTaxableGainEstimate) : "n/a"}`);
  console.log(`Move category:           ${calcs.moveCategory ?? "n/a"}`);
}

const INTERNAL_TEST_LABEL = "── INTERNAL TEST OUTPUT ──";

function printBuyerReport(report: BuyerAiReport): void {
  console.log("\n════════════════════════════════════════");
  console.log(report.reportTitle);
  console.log("════════════════════════════════════════\n");

  console.log("SUMMARY");
  console.log(report.summary);
  console.log("\nBEST-FIT AREAS");
  for (const area of report.bestFitAreas) {
    console.log(`\n  ${area.area} (${area.fitScore}% fit)`);
    console.log(`  ${area.reason}`);
  }
  console.log("\nBUDGET FIT");
  console.log(`  Rating: ${report.budgetFit.rating}`);
  console.log(`  ${report.budgetFit.explanation}`);
  console.log("\nPROPERTY RECOMMENDATION");
  console.log(`  ${report.propertyRecommendation}`);
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log(`READINESS SCORE: ${report.readinessScore}/100`);
  console.log("\nRECOMMENDED NEXT STEP");
  console.log(`  ${report.recommendedNextStep}`);
  console.log("\nQUESTIONS FOR ADVISORY REVIEW");
  report.questionsForJustin.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("INTERNAL SUMMARY (not shown to user on public result)");
  console.log(`  ${report.internalLeadSummary}`);
  console.log("\nSUGGESTED FOLLOW-UP");
  console.log(`  ${report.suggestedFollowUpMessage}`);
}

function isEnvConfigured(key: string): boolean {
  return Boolean(process.env[key]?.trim());
}

function printSellerPropertyEnrichment(
  input: SellerQuizData,
  ctx: SellerPropertyContext
): void {
  const rentCastConfigured = isEnvConfigured("RENTCAST_API_KEY");
  const googleConfigured = isEnvConfigured("GOOGLE_MAPS_API_KEY");
  const rentCastReturned = ctx.rentCastFacts != null;
  const googleReturned = ctx.googleLocationContext != null;
  const intelligence = ctx.propertyIntelligence;
  const submittedAddress = formatSellerAddress(input.propertyAddress);

  console.log("\n════════════════════════════════════════");
  console.log("Property enrichment");
  console.log("════════════════════════════════════════");
  console.log(`RentCast configured:     ${rentCastConfigured}`);
  console.log(`Google Maps configured:  ${googleConfigured}`);
  console.log(
    `RentCast returned facts: ${rentCastReturned ? "true" : "false"}`
  );
  console.log(
    `Google returned context: ${googleReturned ? "true" : "false"}`
  );
  console.log(`Submitted address:       ${submittedAddress}`);
  const locked = getLockedDisplayAddress(
    input.propertyAddress,
    intelligence
  );
  console.log(`Locked display address:  ${locked.lockedDisplayAddress}`);
  console.log(`Normalized address:      ${intelligence.normalizedAddress}`);
  console.log(
    `Address match confidence:  ${intelligence.addressMatchConfidence}`
  );
  console.log(
    `Address discrepancy:       ${intelligence.addressDiscrepancy ? "true" : "false"}`
  );
  if (intelligence.addressDiscrepancy) {
    console.log(
      `  Submitted (intel):     ${intelligence.submittedAddress}`
    );
    console.log(
      `  Normalized (intel):    ${intelligence.normalizedAddress}`
    );
  }
  console.log(`Data sources:            ${intelligence.dataSources.join(", ")}`);

  if (intelligence.rentCastMismatches.length > 0) {
    console.log("\nRentCast vs seller mismatches:");
    for (const m of intelligence.rentCastMismatches) {
      console.log(
        `  ${m.label}: seller ${m.sellerValue} vs RentCast ${m.rentCastValue}`
      );
    }
  }

  if (rentCastReturned && ctx.rentCastFacts) {
    const rc = ctx.rentCastFacts;
    console.log("\nRentCast facts (normalized):");
    if (rc.bedrooms != null) console.log(`  Bedrooms:      ${rc.bedrooms}`);
    if (rc.bathrooms != null) console.log(`  Bathrooms:     ${rc.bathrooms}`);
    if (rc.squareFeet != null) console.log(`  Sq ft:         ${rc.squareFeet}`);
    if (rc.lotSize != null) console.log(`  Lot sq ft:     ${rc.lotSize}`);
    if (rc.yearBuilt != null) console.log(`  Year built:    ${rc.yearBuilt}`);
    if (rc.propertyType) console.log(`  Type:          ${rc.propertyType}`);
    if (rc.lastSaleDate) console.log(`  Last sale:     ${rc.lastSaleDate}`);
    if (rc.lastSalePrice != null) {
      console.log(`  Last sale $:   ${formatCurrency(rc.lastSalePrice)}`);
    }
    if (rc.assessedValue != null) {
      console.log(`  Assessed:      ${formatCurrency(rc.assessedValue)}`);
    }
    if (rc.rentEstimate != null) {
      console.log(`  Rent est:      ${formatCurrency(rc.rentEstimate)}/mo`);
    }
    if (rc.estimatedValue != null) {
      console.log(
        `  Est. value:    ${formatCurrency(rc.estimatedValue)} (internal only)`
      );
    }
  } else if (rentCastConfigured) {
    console.log("\nRentCast returned no facts");
  } else {
    console.log("\nRentCast skipped (no API key)");
  }

  if (googleReturned && ctx.googleLocationContext) {
    const gm = ctx.googleLocationContext;
    console.log("\nNearby context summary:");
    console.log(`  ${gm.locationContext}`);
    if (gm.nearbyPlaces.length > 0) {
      console.log(
        `  Places (${gm.nearbyPlaces.length}): ${gm.nearbyPlaces
          .map((p) => p.name)
          .join(", ")}`
      );
    }
  } else if (googleConfigured) {
    console.log("\nGoogle returned no context");
  } else {
    console.log("\nGoogle Maps skipped (no API key)");
  }

  if (intelligence.publicVerificationNotes.length > 0) {
    console.log("\nPublic verification notes:");
    intelligence.publicVerificationNotes.forEach((q, i) =>
      console.log(`  ${i + 1}. ${q}`)
    );
  }

  if (intelligence.missingDataQuestions.length > 0) {
    console.log("\nAdmin missing data questions:");
    intelligence.missingDataQuestions.forEach((q, i) =>
      console.log(`  ${i + 1}. ${q}`)
    );
  } else {
    console.log("\nAdmin missing data questions: none");
  }

  console.log(`\nUpgrade signals:         ${intelligence.upgradeSignals.length}`);
  console.log(`Prep focus areas:        ${intelligence.prepFocusAreas.length}`);
  console.log(`Buyer objection risks:   ${intelligence.buyerObjectionRisks.length}`);
  console.log("");
}

function collectSellerPublicText(report: SellerAiReport): string {
  return [
    report.summary,
    report.sellerStrategy,
    report.positioningAngle,
    ...report.prepRecommendations,
    report.recommendedNextStep,
    ...report.questionsForJustin,
    report.suggestedFollowUpMessage,
  ].join("\n");
}

function assertSellerReportQuality(
  fixtureName: string,
  input: SellerQuizData,
  report: SellerAiReport,
  propertyIntelligence: SellerPropertyContext["propertyIntelligence"] | null
): void {
  const publicText = collectSellerPublicText(report);
  const locked = getLockedDisplayAddress(
    input.propertyAddress,
    propertyIntelligence
  );
  const lockedStreetLine =
    locked.lockedDisplayAddress.split(",")[0]?.trim() ?? "";

  console.log("\n── Seller report quality checks ──");
  console.log(`Locked street line:      ${lockedStreetLine}`);

  if (fixtureName === "seller.newport.swimmers-point") {
    const required = "18 Swimmers Point";
    const forbidden = "1800 Swimmers Point";
    if (!publicText.includes(required)) {
      throw new Error(
        `Public seller report must contain "${required}" (fixture ${fixtureName})`
      );
    }
    if (publicText.includes(forbidden)) {
      throw new Error(
        `Public seller report must not contain "${forbidden}" (fixture ${fixtureName})`
      );
    }
    console.log(`✓ Contains "${required}"`);
    console.log(`✓ Does not contain "${forbidden}"`);
  }

  if (input.sellerPriority === "privacy") {
    const wrongPrimary =
      /\b(?:the\s+)?primary\s+priority\s+is\s+(?:achieving\s+)?(?:the\s+)?highest\s+price\b/i;
    if (wrongPrimary.test(publicText)) {
      throw new Error(
        `Privacy priority seller report must not state highest price as the primary priority (fixture ${fixtureName})`
      );
    }
    console.log("✓ Privacy priority not rewritten as highest-price primary");
  }

  if (lockedStreetLine && !publicText.includes(lockedStreetLine)) {
    console.log(
      `⚠ Public text does not include locked street line "${lockedStreetLine}" verbatim (may appear in title only)`
    );
  } else if (lockedStreetLine) {
    console.log(`✓ Public text includes locked street line "${lockedStreetLine}"`);
  }

  const city = input.propertyAddress.city;
  const publicAddress = formatPublicAddress(
    locked.lockedDisplayAddress,
    city
  );
  if (publicAddressHasDuplicateCity(publicAddress, city)) {
    throw new Error(
      `Public display address must not contain duplicate city — got "${publicAddress}" (fixture ${fixtureName})`
    );
  }
  const duplicateCityPattern = new RegExp(
    `${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*,\\s*${city.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
    "i"
  );
  if (duplicateCityPattern.test(publicText)) {
    throw new Error(
      `Public seller report must not contain duplicate city "${city}, ${city}" (fixture ${fixtureName})`
    );
  }
  if (/For the property,/i.test(publicText)) {
    throw new Error(
      `Public seller report must not contain "For the property," (fixture ${fixtureName})`
    );
  }
  const addressMentions = countAddressMentionsInText(
    publicText,
    locked.lockedDisplayAddress,
    city
  );
  if (addressMentions > 2) {
    throw new Error(
      `Public seller report mentions full address ${addressMentions} times (max 2) — fixture ${fixtureName}`
    );
  }
  console.log(
    `✓ Address mentions in public report: ${addressMentions} (max 2, public form: "${publicAddress}")`
  );

  if (publicText.includes(", USA")) {
    throw new Error(
      `Public seller report must not include ", USA" in address — fixture ${fixtureName}`
    );
  }
  console.log('✓ Public report avoids ", USA" suffix');

  for (const [index, rec] of report.prepRecommendations.entries()) {
    if (itemStartsWithAddressLeadIn(rec, locked.lockedDisplayAddress)) {
      throw new Error(
        `Prep recommendation ${index + 1} must not start with "For/At/Regarding {address}," — fixture ${fixtureName}`
      );
    }
  }
  console.log("✓ Prep recommendations do not lead with full address");

  for (const [index, question] of report.questionsForJustin.entries()) {
    if (itemStartsWithAddressLeadIn(question, locked.lockedDisplayAddress)) {
      throw new Error(
        `Question ${index + 1} must not start with "For/At/Regarding {address}," — fixture ${fixtureName}`
      );
    }
  }
  console.log("✓ Advisor questions do not lead with full address");
  console.log(`✓ No duplicate city in public address ("${publicAddress}")`);
  console.log(`✓ No duplicate "${city}, ${city}" or "For the property," phrasing`);
}

function printSellerReport(report: SellerAiReport): void {
  console.log("\n════════════════════════════════════════");
  console.log(report.reportTitle);
  console.log("════════════════════════════════════════\n");

  console.log("SUMMARY");
  console.log(report.summary);
  console.log("\nSELLER STRATEGY");
  console.log(`  ${report.sellerStrategy}`);
  console.log("\nPOSITIONING ANGLE");
  console.log(`  ${report.positioningAngle}`);
  console.log("\nPREP RECOMMENDATIONS");
  report.prepRecommendations.forEach((rec, i) =>
    console.log(`  ${i + 1}. ${rec}`)
  );
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log(`READINESS SCORE: ${report.readinessScore}/100`);
  console.log("\nRECOMMENDED NEXT STEP");
  console.log(`  ${report.recommendedNextStep}`);
  console.log("\nQUESTIONS FOR ADVISORY REVIEW");
  report.questionsForJustin.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("INTERNAL SUMMARY");
  console.log(`  ${report.internalLeadSummary}`);
  console.log("\nSUGGESTED FOLLOW-UP");
  console.log(`  ${report.suggestedFollowUpMessage}`);
}

function printWealthForecastReport(report: WealthForecastReport): void {
  console.log("\n════════════════════════════════════════");
  console.log(report.reportTitle);
  console.log("════════════════════════════════════════\n");

  console.log("PUBLIC SUMMARY");
  console.log(report.publicSummary);
  console.log("\nFORECAST SNAPSHOT");
  const s = report.forecastSnapshot;
  console.log(`  Purchase: ${s.purchasePrice != null ? formatCurrency(s.purchasePrice) : "n/a"}`);
  console.log(`  Down:     ${s.downPaymentAmount != null ? formatCurrency(s.downPaymentAmount) : "n/a"}`);
  console.log(`  Loan:     ${s.loanAmount != null ? formatCurrency(s.loanAmount) : "n/a"}`);
  console.log(`  LTV:      ${s.loanToValue ?? "n/a"}%`);
  console.log(`  Carry:    ${s.estimatedMonthlyCarry != null ? formatCurrency(s.estimatedMonthlyCarry) : "n/a"}/mo`);
  console.log("\nSCENARIO COMPARISON");
  for (const [name, row] of Object.entries(report.scenarioComparison)) {
    console.log(`  ${name}: ${(row.annualAppreciation * 100).toFixed(1)}% | FV ${row.futureValue != null ? formatCurrency(row.futureValue) : "n/a"} | Equity ${row.estimatedEquity != null ? formatCurrency(row.estimatedEquity) : "n/a"} | ${row.equityMultiple ?? "n/a"}x`);
  }
  console.log("\nLEVERAGE STRATEGY");
  console.log(`  ${report.leverageStrategy}`);
  console.log("\nOWNERSHIP COST NOTES");
  console.log(`  ${report.ownershipCostNotes}`);
  console.log("\nTAX PLANNING TOPICS");
  report.taxPlanningTopics.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  console.log("\nRECOMMENDED NEXT STEP");
  console.log(`  ${report.recommendedNextStep}`);
  console.log("\nQUESTIONS FOR ADVISORY REVIEW");
  report.questionsForJustin.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("INTERNAL SUMMARY");
  console.log(`  ${report.internalLeadSummary}`);
  console.log("\nSUGGESTED FOLLOW-UP");
  console.log(`  ${report.suggestedFollowUpMessage}`);
}

function printEquityReport(report: EquityMoveReport): void {
  const basis = report.valueEstimateBasis;
  console.log("\n════════════════════════════════════════");
  console.log(report.reportTitle);
  console.log("════════════════════════════════════════\n");

  console.log("PUBLIC SUMMARY");
  console.log(report.publicSummary);
  console.log("\nVALUE ESTIMATE BASIS");
  console.log(`  ${basis.basisNote}`);
  console.log(
    `  Planning value: ${basis.estimatedValue != null ? formatCurrency(basis.estimatedValue) : "TBD"}`
  );
  console.log(`  Comparables:    ${basis.comparableCount ?? "n/a"}`);
  console.log(`  Confidence:     ${basis.confidence}`);
  console.log("\nEQUITY SNAPSHOT");
  const s = report.equitySnapshot;
  console.log(`  Appreciation: ${s.estimatedAppreciation != null ? formatCurrency(s.estimatedAppreciation) : "n/a"}`);
  console.log(`  Gross equity: ${s.grossEquity != null ? formatCurrency(s.grossEquity) : "n/a"}`);
  console.log(`  Years owned:  ${s.ownershipYears ?? "n/a"}`);
  console.log(`  Category:     ${s.moveCategory ?? "n/a"}`);
  console.log("\nSALE SCENARIO");
  const sale = report.saleScenario;
  console.log(`  Net (low):    ${sale.estimatedNetBeforeTaxLow != null ? formatCurrency(sale.estimatedNetBeforeTaxLow) : "n/a"}`);
  console.log(`  Net (high):   ${sale.estimatedNetBeforeTaxHigh != null ? formatCurrency(sale.estimatedNetBeforeTaxHigh) : "n/a"}`);
  console.log(`  Selling costs: ${sale.sellingCostRange}`);
  console.log(`  Taxable gain (planning): ${sale.potentialTaxableGainEstimate != null ? formatCurrency(sale.potentialTaxableGainEstimate) : "n/a"}`);
  console.log("\nTAX PLANNING NOTE");
  console.log(`  ${report.taxPlanningNote}`);
  console.log("\nNEXT MOVE STRATEGY");
  console.log(`  ${report.nextMoveStrategy}`);
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log(`READINESS SCORE: ${report.readinessScore}/100`);
  console.log("\nRECOMMENDED NEXT STEP");
  console.log(`  ${report.recommendedNextStep}`);
  console.log("\nQUESTIONS FOR ADVISORY REVIEW");
  report.questionsForJustin.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("INTERNAL SUMMARY");
  console.log(`  ${report.internalLeadSummary}`);
  console.log("\nSUGGESTED FOLLOW-UP");
  console.log(`  ${report.suggestedFollowUpMessage}`);
}

function printLeadConcierge(concierge: LeadConcierge, meta: Awaited<ReturnType<typeof generateLeadConcierge>>): void {
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("Lead Concierge (admin-only)");
  console.log(`Source:                  ${meta.source}`);
  console.log(`Model:                   ${meta.model}`);
  console.log(`\nLead priority reason:\n  ${concierge.leadPriorityReason}`);
  console.log(`\nCall opener:\n  ${concierge.callOpener}`);
  console.log(`\nSMS follow-up:\n  ${concierge.smsFollowUp}`);
  console.log(`\nEmail follow-up:\n  ${concierge.emailFollowUp}`);
  console.log("\nObjections to expect:");
  concierge.objectionsToExpect.forEach((o, i) => console.log(`  ${i + 1}. ${o}`));
  console.log(`\nRecommended timeline:\n  ${concierge.recommendedFollowUpTimeline}`);
  console.log(`\nNext best action:\n  ${concierge.nextBestAction}`);
}

async function runLeadConcierge(
  input: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData,
  internalLeadSummary: string,
  equityIntelligence?: Awaited<ReturnType<typeof enrichEquityProperty>> | null
): Promise<Awaited<ReturnType<typeof generateLeadConcierge>>> {
  if (input.leadType === "buyer") {
    const leadScore = calculateBuyerLeadScore(input);
    const leadTemperature = getLeadTemperature(leadScore);
    const meta = await generateLeadConcierge({
      leadType: "buyer",
      quizData: input,
      leadScore,
      leadTemperature,
      internalLeadSummary,
    });
    printLeadConcierge(meta.concierge, meta);
    return meta;
  }
  if (input.leadType === "seller") {
    const leadScore = calculateSellerLeadScore(input);
    const leadTemperature = getLeadTemperature(leadScore);
    const meta = await generateLeadConcierge({
      leadType: "seller",
      quizData: input,
      leadScore,
      leadTemperature,
      internalLeadSummary,
    });
    printLeadConcierge(meta.concierge, meta);
    return meta;
  }
  if (input.leadType === "equity") {
    const calculations = calculateEquityMove(input, {
      rentCastEstimatedValue: equityIntelligence?.estimatedValue,
      equityPropertyIntelligence: equityIntelligence ?? null,
    });
    const leadScore = calculateEquityLeadScore(input, calculations);
    const leadTemperature = getLeadTemperature(leadScore);
    const meta = await generateLeadConcierge({
      leadType: "equity",
      quizData: input,
      leadScore,
      leadTemperature,
      internalLeadSummary,
      equityCalculations: calculations,
      equityPropertyIntelligence: equityIntelligence ?? null,
    });
    printLeadConcierge(meta.concierge, meta);
    return meta;
  }
  const calculations = calculateWealthForecast(input);
  const leadScore = calculateWealthForecastLeadScore(input, calculations);
  const leadTemperature = getLeadTemperature(leadScore);
  const meta = await generateLeadConcierge({
    leadType: "wealth_forecast",
    quizData: input,
    leadScore,
    leadTemperature,
    internalLeadSummary,
    wealthCalculations: calculations,
  });
  printLeadConcierge(meta.concierge, meta);
  return meta;
}

async function saveToSupabase(
  input: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData
): Promise<void> {
  console.log("\n── Saving test lead to Supabase ──");
  const result = await processLeadSubmission(
    { ...input, honeypot: "" },
    { userAgent: "ai-test-harness" }
  );
  console.log(`Saved lead id: ${result.leadId}`);
  console.log(`Result token:  ${result.token}`);
  console.log(
    `View at:       ${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/result?token=${result.token}`
  );
}

function printUsage(): void {
  console.log(`
Private Client Property Desk AI Test Harness

Usage:
  npm run ai:test -- <fixture> [save]

Fixtures:
  ${FIXTURES.join("\n  ")}

Examples:
  npm run ai:test -- equity.irvine.owned10
  npm run ai:test -- buyer.irvine.townhome save
`);
}

async function main(): Promise<void> {
  assertGpt5RequestOptionsCompliance();
  console.log("✓ GPT-5 request options compliance check passed");

  const args = process.argv.slice(2).filter((a) => a !== "--");
  const fixtureArg = args.find((a) => a !== "save");
  const shouldSave = args.includes("save");

  if (!fixtureArg || !FIXTURES.includes(fixtureArg as FixtureName)) {
    printUsage();
    process.exit(fixtureArg ? 1 : 0);
  }

  const fixtureName = fixtureArg as FixtureName;
  console.log(`\nLoading fixture: ${fixtureName}`);
  const input = loadFixture(fixtureName);

  if (
    typeof input === "object" &&
    input !== null &&
    "leadType" in input &&
    input.leadType === "private_client_demo"
  ) {
    await runPrivateClientDemoTest(
      fixtureName,
      input as Record<string, unknown>
    );
    return;
  }

  const quizInput = input as
    | BuyerQuizData
    | SellerQuizData
    | EquityQuizData
    | WealthQuizData;

  let equityIntelligence: Awaited<ReturnType<typeof enrichEquityProperty>> | null =
    null;
  if (quizInput.leadType === "wealth_forecast") {
    printWealthCalculations(quizInput);
  }

  printModelRouting();
  printQuizContext(quizInput);

  let result: Awaited<ReturnType<typeof generateReport>>;
  let sellerCtx: SellerPropertyContext | null = null;
  if (quizInput.leadType === "seller") {
    sellerCtx = await prepareSellerPropertyContext(quizInput);
    printSellerPropertyEnrichment(quizInput, sellerCtx);
    result = await generateSellerReport(quizInput, sellerCtx.propertyIntelligence);
  } else if (quizInput.leadType === "equity") {
    equityIntelligence = await enrichEquityProperty({
      address: formatEquityAddress(quizInput.propertyAddress),
      city: quizInput.propertyAddress.city,
      state: quizInput.propertyAddress.state,
      zip: quizInput.propertyAddress.zip,
      yearPurchased: quizInput.yearPurchased,
      originalPurchasePrice: quizInput.originalPurchasePrice,
      mortgageBalance: quizInput.mortgageBalance,
    });
    printEquityPropertyEnrichment(quizInput, equityIntelligence);
    printEquityCalculations(quizInput, equityIntelligence);
    result = await generateEquityReport(quizInput, equityIntelligence);
  } else {
    result = await generateReport(quizInput);
  }

  printGenerationMeta(quizInput, result);

  if (quizInput.leadType === "buyer") {
    printBuyerReport(result.report as BuyerAiReport);
  } else if (quizInput.leadType === "seller") {
    const sellerReport = result.report as SellerAiReport;
    printSellerReport(sellerReport);
    assertSellerReportQuality(
      fixtureName,
      quizInput,
      sellerReport,
      sellerCtx?.propertyIntelligence ?? null
    );
  } else if (quizInput.leadType === "equity") {
    printEquityReport(result.report as EquityMoveReport);
  } else {
    printWealthForecastReport(result.report as WealthForecastReport);
  }

  const internalSummary =
    (result.report as { internalLeadSummary: string }).internalLeadSummary;
  const conciergeMeta = await runLeadConcierge(
    quizInput,
    internalSummary,
    equityIntelligence
  );

  if (shouldSave) {
    await saveToSupabase(quizInput);
  } else {
    console.log('\n(Supabase save skipped — pass "save" to persist a test lead)');
  }

  console.log("\n── Raw JSON ──");
  console.log(JSON.stringify(result.report, null, 2));
  console.log(`\n${INTERNAL_TEST_LABEL}`);
  console.log("Lead Concierge JSON");
  console.log(JSON.stringify(conciergeMeta.concierge, null, 2));
  console.log("");
}

main().catch((err) => {
  console.error("Test harness failed:", err);
  process.exit(1);
});
