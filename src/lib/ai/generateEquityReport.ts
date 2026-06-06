import { buildModelSelectionForEquity } from "@/lib/ai/build-model-selection";
import { createStructuredChatCompletion } from "@/lib/ai/buildOpenAIRequestOptions";
import {
  generateOpenAiReportWithModelOrder,
  getDeterministicFallbackMeta,
  getOpenAIClient,
} from "@/lib/ai/openai-report-client";
import { stripPlaceholderNameFromProse } from "@/lib/ai/report-labels";
import { DETERMINISTIC_FALLBACK_MODEL } from "@/lib/ai/selectReportModel";
import {
  buildEquityFollowUpMessage,
  buildEquityReportTitle,
  EQUITY_RECOMMENDED_NEXT_STEP,
  EQUITY_SEQUENCE_GUIDANCE,
  estimateEquityReadiness,
  formatGrossEquityPhrase,
  logReportSource,
} from "@/lib/ai/equity-report-labels";
import {
  formatCurrency,
  type EquityCalculations,
} from "@/lib/equity/calculateEquityMove";
import type {
  CurrentValueSource,
  EquityPropertyIntelligence,
} from "@/lib/property/equityPropertyTypes";
import { formatEquityAddress } from "@/lib/property/equityPropertyTypes";
import {
  equityMoveReportSchema,
  type EquityMoveReport,
} from "@/lib/schemas/ai-report";
import type { EquityQuizData } from "@/lib/schemas/quiz";
import {
  EQUITY_CONCERN_LABELS,
  EQUITY_GOAL_LABELS,
  EQUITY_TIMELINE_LABELS,
} from "@/lib/constants";
import type { ReportSource } from "@/lib/ai/report-labels";
import {
  getDefaultTenant,
  getTenantSupportedRegionLabel,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

export interface GeneratedEquityReport {
  report: EquityMoveReport;
  source: ReportSource;
  model: string;
  durationMs: number;
  calculations: EquityCalculations;
  leadScore: number;
  fallbackModelAttempted: boolean;
  premiumModelFailed: boolean;
  miniBackupModelFailed: boolean;
  premiumModelFailedError?: string;
  miniBackupModelFailedError?: string;
  error?: string;
}

function buildEquitySystem(tenant: TenantConfig): string {
  return `You are a private ${getTenantSupportedRegionLabel(tenant)} real estate equity planning assistant for ${tenant.agentName} at ${tenant.brandName}.

VOICE: Premium advisory note — strategic, calm, substantive. Reference the homeowner's actual inputs and the provided calculation estimates.

COMPLIANCE — strictly follow:
- No tax advice. Never tell them what they owe or recommend specific tax elections.
- Say estimates are planning ranges; a CPA should confirm tax treatment.
- No exact home valuations, appraisals, CMAs, or guaranteed sale price, net proceeds, or appreciation.
- Use planning estimate, estimate range, automated estimate, comparable sale context — ${tenant.agentName} should confirm pricing.
- Do not mention Zillow, Redfin, Realtor.com, MLS, or RPR unless the homeowner stated it in freeText.
- Do not mention empty nesters, family status, children, schools, or demographics.
- ${getTenantSupportedRegionLabel(tenant)} only. Use language like estimate, scenario, planning range, confirm with CPA.
- Do not mention MLS/IDX live data.

BANNED: maximize, ensure, guaranteed, perfect fit, investment potential, current market dynamics, travel brochure language, equity range (when grossEquity is a single number — use "estimated gross equity of roughly $X"), consider a contingent offer (never recommend contingent offers directly)`;
}

function buildEquityInstructions(tenant: TenantConfig): string {
  return `Generate an Equity Move Up Plan as JSON using the quiz data and calculation estimates provided.

VALUE BASIS — follow valueBasisGuidance in the user message for publicSummary and valueEstimateBasis.basisNote tone. Never present an automated estimate as an appraisal or exact market value.

WORDING RULES:
- grossEquity is a single number. Never call it an "equity range." Use: "estimated gross equity of roughly $X"
- Only use "range" for: selling cost range, estimated net before tax (low to high), or planning range
- Never say "consider a contingent offer." For sale/purchase sequencing use: "${EQUITY_SEQUENCE_GUIDANCE}"
- recommendedNextStep must be exactly: "${EQUITY_RECOMMENDED_NEXT_STEP}"

LENGTH: publicSummary 80–130 words; taxPlanningNote 45–80 words; nextMoveStrategy 60–100 words; suggestedFollowUpMessage 50–90 words.

Fields:
1. reportTitle — personalized if real first name, else "Your Private ${getTenantSupportedRegionLabel(tenant)} Equity Move Up Plan"
2. publicSummary — weave in city, ownership years, gross equity phrasing when available (or note that current value needs confirmation), next move goal, timeline, biggest concern, one tradeoff, next step with ${tenant.agentName}
3. equitySnapshot — use the exact numeric values from calculations (estimatedAppreciation, grossEquity, ownershipYears, moveCategory)
4. saleScenario — use exact numbers from calculations for nets and potentialTaxableGainEstimate; sellingCostRange from calculations
5. taxPlanningNote — planning-only; mention exclusion is a general planning reference; CPA must confirm; no tax advice
6. nextMoveStrategy — align with nextMoveGoal and timeline; address biggestConcern; use sequence guidance language for sell/buy timing — never recommend a contingent offer directly
7. readinessScore — 0–100 from timeline, equity strength, goal clarity
8. recommendedNextStep — use exactly the required sentence above
9. questionsForJustin — exactly 4 questions on equity, timing, next move, tax planning coordination with CPA
10. internalLeadSummary — CRM note: ownership years, estimated gross equity, timeline, goal, concern, seller-only vs buyer-seller combo, best follow-up angle
11. suggestedFollowUpMessage — polished agent text; Hi FirstName or Hi there for placeholder names`;
}

const equityJsonSchema = {
  type: "object",
  properties: {
    reportTitle: { type: "string" },
    publicSummary: { type: "string" },
    equitySnapshot: {
      type: "object",
      properties: {
        estimatedAppreciation: { type: "number" },
        grossEquity: { type: "number" },
        ownershipYears: { type: "number" },
        moveCategory: { type: "string" },
      },
      required: [
        "estimatedAppreciation",
        "grossEquity",
        "ownershipYears",
        "moveCategory",
      ],
      additionalProperties: false,
    },
    saleScenario: {
      type: "object",
      properties: {
        estimatedNetBeforeTaxLow: { type: "number" },
        estimatedNetBeforeTaxHigh: { type: "number" },
        sellingCostRange: { type: "string" },
        potentialTaxableGainEstimate: { type: "number" },
      },
      required: [
        "estimatedNetBeforeTaxLow",
        "estimatedNetBeforeTaxHigh",
        "sellingCostRange",
        "potentialTaxableGainEstimate",
      ],
      additionalProperties: false,
    },
    taxPlanningNote: { type: "string" },
    nextMoveStrategy: { type: "string" },
    readinessScore: { type: "number" },
    recommendedNextStep: { type: "string" },
    questionsForJustin: { type: "array", items: { type: "string" } },
    internalLeadSummary: { type: "string" },
    suggestedFollowUpMessage: { type: "string" },
  },
  required: [
    "reportTitle",
    "publicSummary",
    "equitySnapshot",
    "saleScenario",
    "taxPlanningNote",
    "nextMoveStrategy",
    "readinessScore",
    "recommendedNextStep",
    "questionsForJustin",
    "internalLeadSummary",
    "suggestedFollowUpMessage",
  ],
  additionalProperties: false,
} as const;

function sanitizeEquityText(text: string, calcs?: EquityCalculations): string {
  let result = text
    .replace(/\bcurrent market conditions\b/gi, "stated timing and preparation goals")
    .replace(/\bcurrent market dynamics\b/gi, "stated timing and preparation goals")
    .replace(/\bmaximize\b/gi, "strengthen")
    .replace(/\bensure\b/gi, "confirm")
    .replace(/\bconsider a contingent offer\b/gi, EQUITY_SEQUENCE_GUIDANCE)
    .replace(/\bconsider using a contingent offer\b/gi, EQUITY_SEQUENCE_GUIDANCE)
    .replace(/\bcontingent offer\b/gi, "contingent structure");

  if (calcs?.grossEquity != null) {
    const grossPhrase = formatGrossEquityPhrase(calcs.grossEquity);
    result = result.replace(/\bestimated equity range\b/gi, grossPhrase);
    result = result.replace(/\bequity range of\b/gi, `${grossPhrase} of`);
    result = result.replace(/\bequity ranges\b/gi, grossPhrase);
    result = result.replace(/\bequity range\b/gi, grossPhrase);
  }

  return result;
}

function sanitizeEquityReport(
  report: EquityMoveReport,
  calcs: EquityCalculations,
  firstName: string
): EquityMoveReport {
  return {
    ...report,
    publicSummary: stripPlaceholderNameFromProse(
      sanitizeEquityText(report.publicSummary, calcs),
      firstName
    ),
    taxPlanningNote: sanitizeEquityText(report.taxPlanningNote, calcs),
    nextMoveStrategy: sanitizeEquityText(report.nextMoveStrategy, calcs),
    recommendedNextStep: EQUITY_RECOMMENDED_NEXT_STEP,
    questionsForJustin: report.questionsForJustin.map((q) =>
      sanitizeEquityText(q, calcs)
    ),
    internalLeadSummary: sanitizeEquityText(report.internalLeadSummary, calcs),
    suggestedFollowUpMessage: stripPlaceholderNameFromProse(
      sanitizeEquityText(report.suggestedFollowUpMessage, calcs),
      firstName
    ),
  };
}

function publicValueSourceLabel(source: CurrentValueSource): string {
  const tenant = getDefaultTenant();
  if (source === "rentcast_estimate") return "Property data provider estimate";
  if (source === "user_adjusted") return "Homeowner-adjusted planning estimate";
  if (source === "user_provided") return "Homeowner-provided estimate";
  return `To be confirmed with ${tenant.agentName}`;
}

function buildValueBasisNote(
  source: CurrentValueSource,
  hasValue: boolean
): string {
  const tenant = getDefaultTenant();
  if (!hasValue || source === "unknown") {
    return `The current value should be confirmed with ${tenant.agentName} before net proceeds and move-up options are modeled.`;
  }
  if (source === "rentcast_estimate") {
    return `This planning estimate uses third-party property data and comparable sale context where available. ${tenant.agentName} should confirm pricing with a local review before any decision.`;
  }
  if (source === "user_adjusted") {
    return `This planning estimate uses a value adjusted from the automated estimate. ${tenant.agentName} should confirm pricing with a local review before any decision.`;
  }
  return `This planning estimate uses the value you provided. ${tenant.agentName} should confirm pricing with a local review before any decision.`;
}

function buildValueEstimateBasis(
  data: EquityQuizData,
  calcs: EquityCalculations,
  intelligence?: EquityPropertyIntelligence | null
): EquityMoveReport["valueEstimateBasis"] {
  const hasValue =
    data.estimatedCurrentValue != null && calcs.currentValueSource !== "unknown";
  const confidence =
    calcs.currentValueSource === "unknown"
      ? "unavailable"
      : (intelligence?.estimationConfidence ?? "medium");

  const dataSources: string[] = [];
  if (calcs.currentValueSource === "rentcast_estimate") {
    dataSources.push("third_party_property_data");
  }
  if (
    calcs.currentValueSource === "user_adjusted" ||
    calcs.currentValueSource === "user_provided"
  ) {
    dataSources.push("homeowner_provided_estimate");
  }
  if (intelligence?.googleAddressContext) {
    dataSources.push("address_validation");
  }

  return {
    currentValueSource: calcs.currentValueSource,
    estimatedValue: hasValue ? data.estimatedCurrentValue ?? null : null,
    comparableCount:
      calcs.currentValueSource === "rentcast_estimate"
        ? (intelligence?.comparableCount ?? null)
        : null,
    confidence,
    dataSources,
    basisNote: buildValueBasisNote(calcs.currentValueSource, hasValue),
  };
}

function mergeCalculations(
  report: Omit<EquityMoveReport, "valueEstimateBasis" | "equitySnapshot" | "saleScenario">,
  data: EquityQuizData,
  calcs: EquityCalculations,
  intelligence?: EquityPropertyIntelligence | null
): EquityMoveReport {
  const hasValue = calcs.currentValueSource !== "unknown";

  return {
    ...report,
    valueEstimateBasis: buildValueEstimateBasis(data, calcs, intelligence),
    equitySnapshot: {
      estimatedAppreciation: calcs.estimatedAppreciation,
      grossEquity: calcs.grossEquity,
      ownershipYears: calcs.ownershipYears,
      moveCategory: calcs.moveCategory,
    },
    saleScenario: {
      estimatedNetBeforeTaxLow: calcs.estimatedNetBeforeTaxLow,
      estimatedNetBeforeTaxHigh: calcs.estimatedNetBeforeTaxHigh,
      sellingCostRange: hasValue
        ? (calcs.sellingCostRange ?? "6%–8% of estimated value")
        : "6%–8% of estimated value once a planning value is confirmed",
      potentialTaxableGainEstimate: calcs.potentialTaxableGainEstimate,
    },
  };
}

function buildEquityContext(
  data: EquityQuizData,
  calcs: EquityCalculations,
  intelligence?: EquityPropertyIntelligence | null
): string {
  const tenant = getDefaultTenant();
  const valueBasisGuidance = buildValueBasisNote(
    calcs.currentValueSource,
    calcs.currentValueSource !== "unknown"
  );

  return JSON.stringify(
    {
      propertyAddress: formatEquityAddress(data.propertyAddress),
      currentHomeCity: data.currentHomeCity,
      currentHomeState: data.currentHomeState,
      yearPurchased: data.yearPurchased,
      originalPurchasePrice: data.originalPurchasePrice,
      estimatedCurrentValue: data.estimatedCurrentValue ?? null,
      currentValueSource: calcs.currentValueSource,
      valueSourceLabel: publicValueSourceLabel(calcs.currentValueSource),
      valueBasisGuidance,
      mortgageBalance: data.mortgageBalance,
      estimatedInterestRate: data.estimatedInterestRate ?? null,
      estimatedImprovements: data.estimatedImprovements ?? null,
      filingStatus: data.filingStatus,
      nextMoveGoal: data.nextMoveGoal,
      nextMoveGoalLabel: EQUITY_GOAL_LABELS[data.nextMoveGoal],
      desiredNextLocation: data.desiredNextLocation ?? null,
      timeline: data.timeline,
      timelineLabel: EQUITY_TIMELINE_LABELS[data.timeline],
      biggestConcern: data.biggestConcern,
      biggestConcernLabel: EQUITY_CONCERN_LABELS[data.biggestConcern],
      freeText: data.freeText ?? null,
      contact: {
        firstName: data.contact.firstName,
      },
      tenant: {
        slug: tenant.slug,
        brandName: tenant.brandName,
        agentName: tenant.agentName,
        supportedStates: tenant.supportedStates,
        serviceAreas: tenant.serviceAreas,
        disclaimerText: tenant.disclaimerText,
      },
      calculations: calcs,
      propertyEnrichment: intelligence
        ? {
            normalizedAddress: intelligence.normalizedAddress,
            estimationConfidence: intelligence.estimationConfidence,
            comparableCount: intelligence.comparableCount,
            planningEstimateRange:
              intelligence.estimatedValueLow != null &&
              intelligence.estimatedValueHigh != null
                ? {
                    low: intelligence.estimatedValueLow,
                    high: intelligence.estimatedValueHigh,
                  }
                : null,
            dataSources: intelligence.dataSources,
          }
        : null,
    },
    null,
    2
  );
}

function buildFallbackEquityReport(
  data: EquityQuizData,
  calcs: EquityCalculations,
  intelligence?: EquityPropertyIntelligence | null
): EquityMoveReport {
  const tenant = getDefaultTenant();
  const goal = EQUITY_GOAL_LABELS[data.nextMoveGoal];
  const timeline = EQUITY_TIMELINE_LABELS[data.timeline];
  const concern = EQUITY_CONCERN_LABELS[data.biggestConcern];
  const readiness = estimateEquityReadiness(data, calcs);
  const grossPhrase =
    calcs.grossEquity != null
      ? formatGrossEquityPhrase(calcs.grossEquity)
      : "estimated gross equity in a planning range";
  const netLow =
    calcs.estimatedNetBeforeTaxLow != null
      ? formatCurrency(calcs.estimatedNetBeforeTaxLow)
      : "the lower planning range";
  const netHigh =
    calcs.estimatedNetBeforeTaxHigh != null
      ? formatCurrency(calcs.estimatedNetBeforeTaxHigh)
      : "the upper planning range";

  const isBuyerSeller =
    data.nextMoveGoal === "upsize" ||
    data.nextMoveGoal === "downsize" ||
    data.nextMoveGoal === "relocate within California" ||
    data.nextMoveGoal === "buy second home";

  const valueNote =
    calcs.currentValueSource === "unknown"
      ? `Because your current home value was not confirmed in this intake, the next step is to estimate the home's current market range with ${tenant.agentName} before modeling net proceeds in detail.`
      : `Your equity profile in ${data.currentHomeCity} reflects ${grossPhrase} after ${calcs.ownershipYears ?? "several"} years of ownership.`;

  return sanitizeEquityReport(
    mergeCalculations(
    {
      reportTitle: buildEquityReportTitle(data.contact.firstName),
      publicSummary: `${valueNote} Your next move goal is ${goal.toLowerCase()} on a ${timeline.toLowerCase()} timeline. The main planning tension to evaluate is ${concern.toLowerCase()}, especially how sale timing, any net proceeds planning range, and your next purchase fit together. The next step is to review this scenario with ${tenant.agentName} and pressure test your numbers against timing and preparation goals.`,
      taxPlanningNote: `This is an estimate based on the numbers you provided. A general planning reference for federal capital gains exclusion is ${formatCurrency(calcs.exclusionEstimate ?? 0)} for your filing status — a CPA should confirm tax treatment, cost basis, and any state implications before you act.`,
      nextMoveStrategy: `The strongest path is to align your ${goal.toLowerCase()} goal with a ${timeline.toLowerCase()} timeline while protecting pricing leverage on your ${data.currentHomeCity} home. ${tenant.agentName} can help map the estimated net before tax range (${netLow} to ${netHigh}), coordinate timing if you are buying again, and address ${concern.toLowerCase()}. ${EQUITY_SEQUENCE_GUIDANCE}`,
      readinessScore: readiness,
      recommendedNextStep: EQUITY_RECOMMENDED_NEXT_STEP,
      questionsForJustin: [
        `How should I sequence a sale in ${data.currentHomeCity} if my goal is to ${goal.toLowerCase()}?`,
        `What selling cost and net proceeds planning ranges should I use at my estimated value?`,
        `How does my timeline affect whether I should sell first, buy first, or use another structure?`,
        `What should I confirm with a CPA before moving forward on capital gains planning?`,
      ],
      internalLeadSummary: `${data.contact.firstName} ${data.contact.lastName}, ${data.currentHomeCity}. Owned ~${calcs.ownershipYears ?? "?"} years. ${calcs.grossEquity != null ? formatGrossEquityPhrase(calcs.grossEquity) : "Est. gross equity n/a"}. Goal: ${goal}. Timeline: ${timeline}. Concern: ${concern}. Likely ${isBuyerSeller ? "buyer-seller combo" : "seller-focused"}. Follow up on equity scenario review and ${concern.toLowerCase()}.`,
      suggestedFollowUpMessage: buildEquityFollowUpMessage(data, calcs),
    },
    data,
    calcs,
    intelligence
    ),
    calcs,
    data.contact.firstName
  );
}

async function callEquityOpenAi(
  data: EquityQuizData,
  calcs: EquityCalculations,
  model: string,
  intelligence?: EquityPropertyIntelligence | null
): Promise<EquityMoveReport> {
  const tenant = getDefaultTenant();
  const openai = getOpenAIClient();
  const response = await createStructuredChatCompletion(openai, {
    model,
    messages: [
      { role: "system", content: buildEquitySystem(tenant) },
      { role: "system", content: buildEquityInstructions(tenant) },
      {
        role: "user",
        content: `Create an Equity Move Up Plan:\n${buildEquityContext(data, calcs, intelligence)}`,
      },
    ],
    jsonSchema: {
      name: "equity_report",
      strict: true,
      schema: equityJsonSchema,
    },
    temperaturePreference: 0.5,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty AI response");

  const raw = JSON.parse(content) as Record<string, unknown>;
  const parsed = equityMoveReportSchema.parse({
    ...raw,
    valueEstimateBasis: buildValueEstimateBasis(data, calcs, intelligence),
  });
  return sanitizeEquityReport(
    mergeCalculations(
      {
        ...parsed,
        reportTitle: buildEquityReportTitle(data.contact.firstName),
        suggestedFollowUpMessage: buildEquityFollowUpMessage(data, calcs),
      },
      data,
      calcs,
      intelligence
    ),
    calcs,
    data.contact.firstName
  );
}

export async function generateEquityReport(
  data: EquityQuizData,
  equityPropertyIntelligence?: EquityPropertyIntelligence | null
): Promise<GeneratedEquityReport> {
  const { leadScore, calculations: calcs } = buildModelSelectionForEquity(
    data,
    equityPropertyIntelligence
  );
  const start = Date.now();

  try {
    const attempt = await generateOpenAiReportWithModelOrder({
      leadType: "equity",
      callModel: (modelName) =>
        callEquityOpenAi(data, calcs, modelName, equityPropertyIntelligence),
    });

    logReportSource("equity", "openai");

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
        console.error("[report:equity] premium failed:", meta.premiumModelFailedError);
      }
      if (meta.miniBackupModelFailedError) {
        console.error("[report:equity] mini backup failed:", meta.miniBackupModelFailedError);
      }
    }
    console.log("OpenAI failed, using fallback report");
    logReportSource("equity", "fallback");

    return {
      report: buildFallbackEquityReport(data, calcs, equityPropertyIntelligence),
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
