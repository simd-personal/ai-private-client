import { buildModelSelectionForWealthForecast } from "@/lib/ai/build-model-selection";
import { createStructuredChatCompletion } from "@/lib/ai/buildOpenAIRequestOptions";
import {
  generateOpenAiReportWithModelOrder,
  getDeterministicFallbackMeta,
  getOpenAIClient,
} from "@/lib/ai/openai-report-client";
import { stripPlaceholderNameFromProse, fixWealthFollowUpTypo } from "@/lib/ai/report-labels";
import { DETERMINISTIC_FALLBACK_MODEL } from "@/lib/ai/selectReportModel";
import {
  buildTaxPlanningTopics,
  buildWealthFollowUpMessage,
  buildWealthReportTitle,
  estimateWealthReadiness,
  formatWealthInternalSummary,
  logReportSource,
  WEALTH_RECOMMENDED_NEXT_STEP,
} from "@/lib/ai/wealth-report-labels";
import {
  WEALTH_CARRY_LABELS,
  WEALTH_LEVERAGE_LABELS,
  WEALTH_LIQUIDITY_LABELS,
  WEALTH_PROPERTY_USE_LABELS,
  WEALTH_TIMELINE_LABELS,
} from "@/lib/constants";
import {
  formatCurrency,
  type WealthForecastCalculations,
} from "@/lib/wealth/calculateWealthForecast";
import {
  wealthForecastReportSchema,
  type WealthForecastReport,
} from "@/lib/schemas/ai-report";
import type { WealthQuizData } from "@/lib/schemas/quiz";
import type { ReportSource } from "@/lib/ai/report-labels";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

export interface GeneratedWealthForecastReport {
  report: WealthForecastReport;
  source: ReportSource;
  model: string;
  durationMs: number;
  calculations: WealthForecastCalculations;
  leadScore: number;
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
  error?: string;
}

function buildWealthSystem(tenant: TenantConfig): string {
  return `You are a private ${getTenantSupportedRegionLabel(tenant)} real estate wealth planning assistant for ${tenant.agentName} at ${tenant.brandName}, focused on entrepreneurs, founders, executives, and liquidity-event buyers.

VOICE: Premium advisory note — strategic, calm, substantive. Reference the user's actual inputs and the provided deterministic forecast calculations. Do not invent or change any numeric outputs.

COMPLIANCE — strictly follow:
- No financial, tax, legal, lending, or investment advice.
- No tax advice. Never promise tax savings.
- No appreciation promises. Never call scenarios predictions.
- Use: scenario, planning assumption, model, potential, review with CPA, pressure test.
- BANNED: guaranteed, will return, will appreciate, tax savings guaranteed, investment advice, financial advice, maximize, ensure, perfect fit, dream home, hottest market.

The user receives numbers from a deterministic model. Explain what they mean; do not recalculate or substitute different figures.`;
}

function buildWealthInstructions(tenant: TenantConfig): string {
  return `Generate a Real Estate Wealth Forecast as JSON using quiz data and calculation estimates provided.

Use the EXACT numeric values from calculations for forecastSnapshot and scenarioComparison. Do not invent math.

LENGTH: publicSummary 80–130 words; leverageStrategy 60–100 words; ownershipCostNotes 45–80 words; suggestedFollowUpMessage 50–90 words.

Fields:
1. reportTitle — personalized if real first name, else generic ${getTenantSupportedRegionLabel(tenant)} wealth forecast title
2. publicSummary — weave purchase price, locations, property use, hold period, carry, leverage preference, liquidity situation, one tradeoff, next step with ${tenant.agentName} and CPA/lender review
3. forecastSnapshot — exact numbers from calculations + propertyUse label + targetLocations
4. scenarioComparison — conservative/base/upside with annualAppreciation as decimal rates (0.02, 0.04, 0.06), futureValue, estimatedEquity, equityMultiple from calculations
5. leverageStrategy — align with leveragePreference and loanToValue; planning language only
6. ownershipCostNotes — P&I, tax, insurance, HOA, maintenance as planning assumptions; note if interest rate is a planning assumption
7. taxPlanningTopics — array of strings; expand on provided base topics without giving tax advice
8. recommendedNextStep — use exactly: "${WEALTH_RECOMMENDED_NEXT_STEP}"
9. questionsForJustin — exactly 4 questions on scenario, leverage, carry, timing, CPA coordination
10. internalLeadSummary — CRM note with purchase, down, loan, use, locations, hold, liquidity, leverage, timeline, follow-up angle
11. suggestedFollowUpMessage — polished agent text
12. readinessScore — 0–100 from clarity of inputs and timeline`;
}

const wealthJsonSchema = {
  type: "object",
  properties: {
    reportTitle: { type: "string" },
    publicSummary: { type: "string" },
    forecastSnapshot: {
      type: "object",
      properties: {
        purchasePrice: { type: ["number", "null"] },
        downPaymentAmount: { type: ["number", "null"] },
        loanAmount: { type: ["number", "null"] },
        loanToValue: { type: ["number", "null"] },
        holdPeriodYears: { type: ["number", "null"] },
        propertyUse: { type: "string" },
        targetLocations: { type: "array", items: { type: "string" } },
        estimatedMonthlyCarry: { type: ["number", "null"] },
      },
      required: [
        "purchasePrice",
        "downPaymentAmount",
        "loanAmount",
        "loanToValue",
        "holdPeriodYears",
        "propertyUse",
        "targetLocations",
        "estimatedMonthlyCarry",
      ],
      additionalProperties: false,
    },
    scenarioComparison: {
      type: "object",
      properties: {
        conservative: {
          type: "object",
          properties: {
            annualAppreciation: { type: "number" },
            futureValue: { type: ["number", "null"] },
            estimatedEquity: { type: ["number", "null"] },
            equityMultiple: { type: ["number", "null"] },
          },
          required: [
            "annualAppreciation",
            "futureValue",
            "estimatedEquity",
            "equityMultiple",
          ],
          additionalProperties: false,
        },
        base: {
          type: "object",
          properties: {
            annualAppreciation: { type: "number" },
            futureValue: { type: ["number", "null"] },
            estimatedEquity: { type: ["number", "null"] },
            equityMultiple: { type: ["number", "null"] },
          },
          required: [
            "annualAppreciation",
            "futureValue",
            "estimatedEquity",
            "equityMultiple",
          ],
          additionalProperties: false,
        },
        upside: {
          type: "object",
          properties: {
            annualAppreciation: { type: "number" },
            futureValue: { type: ["number", "null"] },
            estimatedEquity: { type: ["number", "null"] },
            equityMultiple: { type: ["number", "null"] },
          },
          required: [
            "annualAppreciation",
            "futureValue",
            "estimatedEquity",
            "equityMultiple",
          ],
          additionalProperties: false,
        },
      },
      required: ["conservative", "base", "upside"],
      additionalProperties: false,
    },
    leverageStrategy: { type: "string" },
    ownershipCostNotes: { type: "string" },
    taxPlanningTopics: { type: "array", items: { type: "string" } },
    recommendedNextStep: { type: "string" },
    questionsForJustin: { type: "array", items: { type: "string" } },
    internalLeadSummary: { type: "string" },
    suggestedFollowUpMessage: { type: "string" },
    readinessScore: { type: "number" },
  },
  required: [
    "reportTitle",
    "publicSummary",
    "forecastSnapshot",
    "scenarioComparison",
    "leverageStrategy",
    "ownershipCostNotes",
    "taxPlanningTopics",
    "recommendedNextStep",
    "questionsForJustin",
    "internalLeadSummary",
    "suggestedFollowUpMessage",
    "readinessScore",
  ],
  additionalProperties: false,
} as const;

const BANNED_PATTERN =
  /\b(guaranteed|will return|will appreciate|tax savings guaranteed|investment advice|financial advice)\b/gi;

function sanitizeWealthText(text: string): string {
  return fixWealthFollowUpTypo(
    text
      .replace(BANNED_PATTERN, "planning scenario")
      .replace(/\bmaximize\b/gi, "strengthen")
      .replace(/\bensure\b/gi, "confirm")
  );
}

function sanitizeWealthReport(
  report: WealthForecastReport,
  firstName: string
): WealthForecastReport {
  return {
    ...report,
    publicSummary: stripPlaceholderNameFromProse(
      sanitizeWealthText(report.publicSummary),
      firstName
    ),
    leverageStrategy: sanitizeWealthText(report.leverageStrategy),
    ownershipCostNotes: sanitizeWealthText(report.ownershipCostNotes),
    taxPlanningTopics: report.taxPlanningTopics.map(sanitizeWealthText),
    recommendedNextStep: WEALTH_RECOMMENDED_NEXT_STEP,
    questionsForJustin: report.questionsForJustin.map(sanitizeWealthText),
    internalLeadSummary: sanitizeWealthText(report.internalLeadSummary),
    suggestedFollowUpMessage: stripPlaceholderNameFromProse(
      sanitizeWealthText(report.suggestedFollowUpMessage),
      firstName
    ),
  };
}

function buildScenarioComparison(calcs: WealthForecastCalculations) {
  return {
    conservative: {
      annualAppreciation: calcs.scenarioAppreciationRates.conservative,
      futureValue: calcs.futureValueConservative,
      estimatedEquity: calcs.equityConservative,
      equityMultiple: calcs.equityMultipleConservative,
    },
    base: {
      annualAppreciation: calcs.scenarioAppreciationRates.base,
      futureValue: calcs.futureValueBase,
      estimatedEquity: calcs.equityBase,
      equityMultiple: calcs.equityMultipleBase,
    },
    upside: {
      annualAppreciation: calcs.scenarioAppreciationRates.upside,
      futureValue: calcs.futureValueUpside,
      estimatedEquity: calcs.equityUpside,
      equityMultiple: calcs.equityMultipleUpside,
    },
  };
}

function mergeCalculations(
  report: WealthForecastReport,
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): WealthForecastReport {
  return {
    ...report,
    forecastSnapshot: {
      purchasePrice: calcs.purchasePrice,
      downPaymentAmount: calcs.downPaymentAmount,
      loanAmount: calcs.loanAmount,
      loanToValue: calcs.loanToValue,
      holdPeriodYears: calcs.holdPeriodYears,
      propertyUse: WEALTH_PROPERTY_USE_LABELS[data.propertyUse],
      targetLocations: data.targetLocations,
      estimatedMonthlyCarry: calcs.estimatedMonthlyCarry,
    },
    scenarioComparison: buildScenarioComparison(calcs),
    taxPlanningTopics: buildTaxPlanningTopics(data.propertyUse),
  };
}

function buildWealthContext(
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): string {
  const tenant = getDefaultTenant();
  return JSON.stringify(
    {
      purchasePrice: data.purchasePrice,
      downPaymentType: data.downPaymentType,
      propertyUse: data.propertyUse,
      propertyUseLabel: WEALTH_PROPERTY_USE_LABELS[data.propertyUse],
      targetLocations: data.targetLocations,
      holdPeriodYears: data.holdPeriodYears,
      interestRateProvided: data.interestRate ?? null,
      interestRateUsed: calcs.interestRateUsed,
      interestRateIsAssumption: calcs.interestRateIsAssumption,
      liquiditySituation: WEALTH_LIQUIDITY_LABELS[data.liquiditySituation],
      leveragePreference: WEALTH_LEVERAGE_LABELS[data.leveragePreference],
      riskProfile: data.riskProfile,
      monthlyCarryComfort: WEALTH_CARRY_LABELS[data.monthlyCarryComfort],
      timeline: WEALTH_TIMELINE_LABELS[data.timeline],
      freeText: data.freeText ?? null,
      contact: { firstName: data.contact.firstName },
      tenant: {
        slug: tenant.slug,
        brandName: tenant.brandName,
        agentName: tenant.agentName,
        supportedStates: tenant.supportedStates,
        serviceAreas: tenant.serviceAreas,
        disclaimerText: tenant.disclaimerText,
      },
      calculations: calcs,
      baseTaxTopics: buildTaxPlanningTopics(data.propertyUse),
    },
    null,
    2
  );
}

function buildFallbackWealthReport(
  data: WealthQuizData,
  calcs: WealthForecastCalculations
): WealthForecastReport {
  const tenant = getDefaultTenant();
  const locations = data.targetLocations.join(", ");
  const use = WEALTH_PROPERTY_USE_LABELS[data.propertyUse];
  const leverage = WEALTH_LEVERAGE_LABELS[data.leveragePreference];
  const timeline = WEALTH_TIMELINE_LABELS[data.timeline];
  const liquidity = WEALTH_LIQUIDITY_LABELS[data.liquiditySituation];
  const price =
    calcs.purchasePrice != null
      ? formatCurrency(calcs.purchasePrice)
      : "your target purchase price";
  const carry =
    calcs.estimatedMonthlyCarry != null
      ? formatCurrency(calcs.estimatedMonthlyCarry)
      : "a carry range to model with a lender";
  const rateNote = calcs.interestRateIsAssumption
    ? ` Financing uses a ${calcs.interestRateUsed}% planning assumption for principal and interest — confirm actual rates with a lender.`
    : "";

  const report: WealthForecastReport = {
    reportTitle: buildWealthReportTitle(data.contact.firstName),
    publicSummary: `Your wealth forecast scenario centers on ${price} in ${locations} as a ${use.toLowerCase()} over a ${data.holdPeriodYears}-year hold. With ${leverage.toLowerCase()} and ${liquidity.toLowerCase()}, the model shows an estimated monthly carry near ${carry} under the assumptions you provided — not a prediction of future returns. The main tradeoff to pressure test is how carry, leverage, and hold period interact with your ${timeline.toLowerCase()} timeline. Review this scenario with ${tenant.agentName} and confirm tax and lending details with a CPA and lender.`,
    forecastSnapshot: {
      purchasePrice: calcs.purchasePrice,
      downPaymentAmount: calcs.downPaymentAmount,
      loanAmount: calcs.loanAmount,
      loanToValue: calcs.loanToValue,
      holdPeriodYears: calcs.holdPeriodYears,
      propertyUse: use,
      targetLocations: data.targetLocations,
      estimatedMonthlyCarry: calcs.estimatedMonthlyCarry,
    },
    scenarioComparison: buildScenarioComparison(calcs),
    leverageStrategy: `Your stated preference is ${leverage.toLowerCase()}${calcs.loanToValue != null ? ` with a modeled loan-to-value near ${calcs.loanToValue}%` : ""}. This is a planning scenario to compare cash preserved versus debt service — ${tenant.agentName} can help pressure test structure with a lender before you commit.`,
    ownershipCostNotes: `Estimated monthly carry combines principal and interest, property tax, insurance, HOA, and maintenance reserves as planning assumptions.${rateNote} Annual carry is roughly ${calcs.annualCarry != null ? formatCurrency(calcs.annualCarry) : carry} in this model — confirm insurance, tax, and HOA with local sources.`,
    taxPlanningTopics: buildTaxPlanningTopics(data.propertyUse),
    recommendedNextStep: WEALTH_RECOMMENDED_NEXT_STEP,
    questionsForJustin: [
      `How should I interpret the ${data.holdPeriodYears}-year scenario for ${locations} given my ${use.toLowerCase()} goal?`,
      `Does ${leverage.toLowerCase()} still fit if monthly carry approaches ${carry}?`,
      `What should I confirm with a lender about rate, reserves, and loan structure?`,
      `Which CPA topics matter most for my property use and hold period?`,
    ],
    internalLeadSummary: formatWealthInternalSummary(data, calcs),
    suggestedFollowUpMessage: buildWealthFollowUpMessage(data, calcs),
    readinessScore: estimateWealthReadiness(data, calcs),
  };

  return sanitizeWealthReport(
    mergeCalculations(report, data, calcs),
    data.contact.firstName
  );
}

async function callWealthOpenAi(
  data: WealthQuizData,
  calcs: WealthForecastCalculations,
  model: string
): Promise<WealthForecastReport> {
  const tenant = getDefaultTenant();
  const openai = getOpenAIClient();
  const response = await createStructuredChatCompletion(openai, {
    model,
    messages: [
      { role: "system", content: buildWealthSystem(tenant) },
      { role: "system", content: buildWealthInstructions(tenant) },
      {
        role: "user",
        content: `Create a Real Estate Wealth Forecast:\n${buildWealthContext(data, calcs)}`,
      },
    ],
    jsonSchema: {
      name: "wealth_forecast_report",
      strict: true,
      schema: wealthJsonSchema,
    },
    temperaturePreference: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const parsed = wealthForecastReportSchema.parse(JSON.parse(content));
  return sanitizeWealthReport(
    mergeCalculations(
      {
        ...parsed,
        reportTitle: buildWealthReportTitle(data.contact.firstName),
        suggestedFollowUpMessage: buildWealthFollowUpMessage(data, calcs),
      },
      data,
      calcs
    ),
    data.contact.firstName
  );
}

export async function generateWealthForecastReport(
  data: WealthQuizData
): Promise<GeneratedWealthForecastReport> {
  const { leadScore, calculations: calcs } =
    buildModelSelectionForWealthForecast(data);
  const start = Date.now();

  try {
    const attempt = await generateOpenAiReportWithModelOrder({
      leadType: "wealth_forecast",
      callModel: (modelName) => callWealthOpenAi(data, calcs, modelName),
    });

    logReportSource("wealth_forecast", "openai");

    return {
      report: attempt.report,
      source: "openai",
      model: attempt.model,
      durationMs: Date.now() - start,
      calculations: calcs,
      leadScore,
      fallbackModelAttempted: attempt.fallbackModelAttempted,
      premiumModelFailed: attempt.premiumModelFailed,
      miniBackupModelFailed: attempt.miniBackupModelFailed,
      premiumModelFailedError: attempt.premiumModelFailedError,
      miniBackupModelFailedError: attempt.miniBackupModelFailedError,
    };
  } catch (error) {
    const meta = getDeterministicFallbackMeta(error);
    if (
      process.env.NODE_ENV === "development" ||
      process.env.AI_TEST === "1"
    ) {
      if (meta.premiumModelFailedError) {
        console.error(
          "[report:wealth_forecast] premium failed:",
          meta.premiumModelFailedError
        );
      }
      if (meta.miniBackupModelFailedError) {
        console.error(
          "[report:wealth_forecast] mini backup failed:",
          meta.miniBackupModelFailedError
        );
      }
    }
    console.log("OpenAI failed, using fallback report");
    logReportSource("wealth_forecast", "fallback");

    return {
      report: buildFallbackWealthReport(data, calcs),
      source: "fallback",
      model: DETERMINISTIC_FALLBACK_MODEL,
      durationMs: Date.now() - start,
      calculations: calcs,
      leadScore,
      fallbackModelAttempted: meta.fallbackModelAttempted,
      premiumModelFailed: meta.premiumModelFailed,
      miniBackupModelFailed: meta.miniBackupModelFailed,
      premiumModelFailedError: meta.premiumModelFailedError,
      miniBackupModelFailedError: meta.miniBackupModelFailedError,
      error: meta.error,
    };
  }
}
