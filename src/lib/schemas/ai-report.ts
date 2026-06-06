import { z } from "zod";

export const buyerAiReportSchema = z.object({
  reportTitle: z.string(),
  summary: z.string(),
  bestFitAreas: z.array(
    z.object({
      area: z.string(),
      reason: z.string(),
      fitScore: z.number().min(0).max(100),
    })
  ),
  budgetFit: z.object({
    rating: z.enum(["strong", "moderate", "challenging"]),
    explanation: z.string(),
  }),
  propertyRecommendation: z.string(),
  readinessScore: z.number().min(0).max(100),
  recommendedNextStep: z.string(),
  /** Legacy JSON key — use getQuestionsForAdvisor() in UI. */
  questionsForJustin: z.array(z.string()),
  internalLeadSummary: z.string(),
  suggestedFollowUpMessage: z.string(),
});

export const sellerAiReportSchema = z.object({
  reportTitle: z.string(),
  summary: z.string(),
  sellerStrategy: z.string(),
  positioningAngle: z.string(),
  prepRecommendations: z.array(z.string()),
  readinessScore: z.number().min(0).max(100),
  recommendedNextStep: z.string(),
  /** Legacy JSON key — use getQuestionsForAdvisor() in UI. */
  questionsForJustin: z.array(z.string()),
  internalLeadSummary: z.string(),
  suggestedFollowUpMessage: z.string(),
});

const wealthScenarioSchema = z.object({
  annualAppreciation: z.number(),
  futureValue: z.number().nullable(),
  estimatedEquity: z.number().nullable(),
  equityMultiple: z.number().nullable(),
});

export const wealthForecastReportSchema = z.object({
  reportTitle: z.string(),
  publicSummary: z.string(),
  forecastSnapshot: z.object({
    purchasePrice: z.number().nullable(),
    downPaymentAmount: z.number().nullable(),
    loanAmount: z.number().nullable(),
    loanToValue: z.number().nullable(),
    holdPeriodYears: z.number().nullable(),
    propertyUse: z.string(),
    targetLocations: z.array(z.string()),
    estimatedMonthlyCarry: z.number().nullable(),
  }),
  scenarioComparison: z.object({
    conservative: wealthScenarioSchema,
    base: wealthScenarioSchema,
    upside: wealthScenarioSchema,
  }),
  leverageStrategy: z.string(),
  ownershipCostNotes: z.string(),
  taxPlanningTopics: z.array(z.string()),
  recommendedNextStep: z.string(),
  /** Legacy JSON key — use getQuestionsForAdvisor() in UI. */
  questionsForJustin: z.array(z.string()),
  internalLeadSummary: z.string(),
  suggestedFollowUpMessage: z.string(),
  readinessScore: z.number().min(0).max(100),
});

export const equityMoveReportSchema = z.object({
  reportTitle: z.string(),
  publicSummary: z.string(),
  valueEstimateBasis: z.object({
    currentValueSource: z.string(),
    estimatedValue: z.number().nullable(),
    comparableCount: z.number().nullable(),
    confidence: z.string(),
    dataSources: z.array(z.string()),
    basisNote: z.string(),
  }),
  equitySnapshot: z.object({
    estimatedAppreciation: z.number().nullable(),
    grossEquity: z.number().nullable(),
    ownershipYears: z.number().nullable(),
    moveCategory: z.string().nullable(),
  }),
  saleScenario: z.object({
    estimatedNetBeforeTaxLow: z.number().nullable(),
    estimatedNetBeforeTaxHigh: z.number().nullable(),
    sellingCostRange: z.string(),
    potentialTaxableGainEstimate: z.number().nullable(),
  }),
  taxPlanningNote: z.string(),
  nextMoveStrategy: z.string(),
  readinessScore: z.number().min(0).max(100),
  recommendedNextStep: z.string(),
  /** Legacy JSON key — use getQuestionsForAdvisor() in UI. */
  questionsForJustin: z.array(z.string()),
  internalLeadSummary: z.string(),
  suggestedFollowUpMessage: z.string(),
});

export type BuyerAiReport = z.infer<typeof buyerAiReportSchema>;
export type SellerAiReport = z.infer<typeof sellerAiReportSchema>;
export type EquityMoveReport = z.infer<typeof equityMoveReportSchema>;
export type WealthForecastReport = z.infer<typeof wealthForecastReportSchema>;
export type PublicBuyerReport = Omit<
  BuyerAiReport,
  "internalLeadSummary" | "suggestedFollowUpMessage" | "readinessScore"
>;
export type PublicSellerReport = Omit<
  SellerAiReport,
  "internalLeadSummary" | "suggestedFollowUpMessage" | "readinessScore"
>;
export type PublicEquityMoveReport = Omit<
  EquityMoveReport,
  "internalLeadSummary" | "suggestedFollowUpMessage" | "readinessScore"
>;
export type PublicWealthForecastReport = Omit<
  WealthForecastReport,
  "internalLeadSummary" | "suggestedFollowUpMessage" | "readinessScore"
>;

/** Stored report JSON uses legacy key `questionsForJustin`; UI should use this helper. */
export function getQuestionsForAdvisor(report: {
  questionsForAdvisor?: string[];
  questionsForJustin?: string[];
}): string[] {
  if (report.questionsForAdvisor?.length) {
    return report.questionsForAdvisor;
  }
  return report.questionsForJustin ?? [];
}

function omitCustomerHiddenFields<
  T extends {
    internalLeadSummary: string;
    suggestedFollowUpMessage: string;
    readinessScore: number;
  },
>(
  report: T
): Omit<T, "internalLeadSummary" | "suggestedFollowUpMessage" | "readinessScore"> {
  const {
    internalLeadSummary: _summary,
    suggestedFollowUpMessage: _followUp,
    readinessScore: _readiness,
    ...publicReport
  } = report;
  void _summary;
  void _followUp;
  void _readiness;
  return publicReport;
}

export function stripInternalFromBuyerReport(
  report: BuyerAiReport
): PublicBuyerReport {
  return omitCustomerHiddenFields(report);
}

export function stripInternalFromSellerReport(
  report: SellerAiReport
): PublicSellerReport {
  return omitCustomerHiddenFields(report);
}

export function stripInternalFromEquityReport(
  report: EquityMoveReport
): PublicEquityMoveReport {
  return omitCustomerHiddenFields(report);
}

export function stripInternalFromWealthForecastReport(
  report: WealthForecastReport
): PublicWealthForecastReport {
  return omitCustomerHiddenFields(report);
}

/** Strip customer-facing fields from stored report JSON (legacy rows may include internal fields). */
export function toPublicReport(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  report: Record<string, unknown>
):
  | PublicBuyerReport
  | PublicSellerReport
  | PublicEquityMoveReport
  | PublicWealthForecastReport {
  const {
    readinessScore: _rs,
    internalLeadSummary: _summary,
    suggestedFollowUpMessage: _followUp,
    ...rest
  } = report;
  void _rs;
  void _summary;
  void _followUp;

  if (leadType === "buyer") {
    return rest as PublicBuyerReport;
  }
  if (leadType === "seller") {
    return rest as PublicSellerReport;
  }
  if (leadType === "wealth_forecast") {
    return rest as PublicWealthForecastReport;
  }
  return rest as PublicEquityMoveReport;
}
