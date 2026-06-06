import { generateBuyerReport, generateSellerReport } from "@/lib/ai/generateReport";
import { enrichEquityProperty } from "@/lib/property/enrichEquityProperty";
import {
  formatEquityAddress,
  resolveCurrentValueSource,
} from "@/lib/property/equityPropertyTypes";
import { prepareSellerPropertyContext } from "@/lib/property/prepareSellerPropertyContext";
import type { LeadConciergeInput } from "@/lib/ai/buildLeadConciergeFallback";
import { buildLeadConciergeFallback } from "@/lib/ai/buildLeadConciergeFallback";
import { generateLeadConcierge } from "@/lib/ai/generateLeadConcierge";
import { sendLeadNotificationEmail } from "@/lib/notifications/email";
import { maybeSendLeadSmsNotification } from "@/lib/notifications/sms";
import type { AttributionData } from "@/lib/schemas/attribution";
import {
  stripInternalFromBuyerReport,
  stripInternalFromEquityReport,
  stripInternalFromSellerReport,
  stripInternalFromWealthForecastReport,
} from "@/lib/schemas/ai-report";
import type { LeadApiRequest } from "@/lib/schemas/lead-api";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import { generateEquityReport } from "@/lib/ai/generateEquityReport";
import { generateWealthForecastReport } from "@/lib/ai/generateWealthForecastReport";
import {
  calculateBuyerLeadScore,
  calculateEquityLeadScore,
  calculateSellerLeadScore,
  calculateWealthForecastLeadScore,
  getLeadTemperature,
} from "@/lib/scoring";
import { calculateEquityMove } from "@/lib/equity/calculateEquityMove";
import { calculateWealthForecast } from "@/lib/wealth/calculateWealthForecast";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generatePublicResultToken } from "@/lib/tokens";
import { generateAndPersistStrategyRoom } from "@/lib/ai/persistStrategyRoom";
import { recordIntakeDecisionVersion } from "@/lib/ai/persistDecisionLayer";
import {
  linkSiteEventsToLead,
  recordLeadCreatedSiteEvent,
} from "@/lib/analytics/server";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";
import {
  shouldSuppressTestNotifications,
  withTestLeadQuizDataMarkers,
} from "@/lib/schemas/test-lead-metadata";
import {
  type TenantConfig,
  withTenantQuizDataMarkers,
} from "@/lib/tenants/tenant-config";

export interface ProcessLeadResult {
  leadId: string;
  token: string;
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
}

function attributionColumns(attribution?: AttributionData) {
  return {
    utm_source: attribution?.utm_source ?? null,
    utm_medium: attribution?.utm_medium ?? null,
    utm_campaign: attribution?.utm_campaign ?? null,
    utm_term: attribution?.utm_term ?? null,
    utm_content: attribution?.utm_content ?? null,
    landing_page: attribution?.landing_page ?? null,
    referrer: attribution?.referrer ?? null,
    gclid: attribution?.gclid ?? null,
    fbclid: attribution?.fbclid ?? null,
  };
}

async function attachLeadConcierge<T extends Record<string, unknown>>(
  storedQuizData: T,
  input: LeadConciergeInput
): Promise<T & { leadConcierge: LeadConcierge }> {
  try {
    const { concierge } = await generateLeadConcierge(input);
    return { ...storedQuizData, leadConcierge: concierge };
  } catch (error) {
    console.error("[concierge] Generation failed, using fallback:", error);
    return {
      ...storedQuizData,
      leadConcierge: buildLeadConciergeFallback(input),
    };
  }
}

async function notifyLead(
  leadId: string,
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData,
  leadScore: number,
  leadTemperature: ReturnType<typeof getLeadTemperature>,
  internalLeadSummary: string,
  suggestedFollowUpMessage: string,
  leadConcierge: LeadConcierge | null,
  tenant: TenantConfig,
  attribution?: AttributionData,
  options?: { suppressNotifications?: boolean }
): Promise<void> {
  if (options?.suppressNotifications) {
    console.log(`[notify] Suppressed notifications for test lead ${leadId}`);
    return;
  }

  const contact = quizData.contact;

  const emailPayload = {
    leadId,
    leadType,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone ?? null,
    preferredContactMethod: contact.preferredContactMethod,
    leadScore,
    leadTemperature,
    quizData,
    internalLeadSummary,
    suggestedFollowUpMessage,
    leadConcierge,
    attribution,
    tenant,
  };

  await Promise.all([
    sendLeadNotificationEmail(emailPayload),
    maybeSendLeadSmsNotification({
      leadId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone ?? null,
      leadTemperature,
      leadScore,
    }),
  ]);
}

export interface ProcessLeadContext {
  userAgent: string | null;
  ipHash?: string | null;
  tenantId: string | null;
  tenant: TenantConfig;
}

async function finalizeSiteAnalytics(
  leadId: string,
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
  request: LeadApiRequest,
  context: ProcessLeadContext
): Promise<void> {
  await linkSiteEventsToLead(request.sessionId, leadId, context.tenantId);
  await recordLeadCreatedSiteEvent({
    leadId,
    leadType,
    sessionId: request.sessionId,
    attribution: request.attribution,
    userAgent: context.userAgent,
    ipHash: context.ipHash ?? null,
    tenantId: context.tenantId,
  });
}

export async function processLeadSubmission(
  request: LeadApiRequest,
  context: ProcessLeadContext
): Promise<ProcessLeadResult> {
  const tenant = context.tenant;
  const supabase = getSupabaseAdmin();
  const token = generatePublicResultToken();
  const attribution = request.attribution;
  const testMetadata = request.testMetadata;
  const suppressNotifications = shouldSuppressTestNotifications(testMetadata);
  const userAgent = context.userAgent;
  void request.honeypot;

  const finalizeQuizData = async <T extends Record<string, unknown>>(
    base: T,
    input: LeadConciergeInput
  ) =>
    withTestLeadQuizDataMarkers(
      withTenantQuizDataMarkers(await attachLeadConcierge(base, input), tenant),
      testMetadata
    );

  const scheduleNotify = (
    leadId: string,
    leadType: "buyer" | "seller" | "equity" | "wealth_forecast",
    quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData,
    leadScore: number,
    leadTemperature: ReturnType<typeof getLeadTemperature>,
    internalLeadSummary: string,
    suggestedFollowUpMessage: string,
    leadConcierge: LeadConcierge | null
  ) => {
    void notifyLead(
      leadId,
      leadType,
      quizData,
      leadScore,
      leadTemperature,
      internalLeadSummary,
      suggestedFollowUpMessage,
      leadConcierge,
      tenant,
      attribution,
      { suppressNotifications }
    ).catch((err) => console.error("[notify] Background notification error:", err));
  };

  if (request.leadType === "buyer") {
    const quizData = {
      leadType: "buyer" as const,
      desiredLocations: request.desiredLocations,
      budgetRange: request.budgetRange,
      propertyType: request.propertyType,
      lifestylePriorities: request.lifestylePriorities,
      timeline: request.timeline,
      financingStatus: request.financingStatus,
      freeText: request.freeText,
      contact: request.contact,
    };
    const { report: aiReport, source: reportSource } =
      await generateBuyerReport(quizData);
    const leadScore = calculateBuyerLeadScore(quizData);
    const leadTemperature = getLeadTemperature(leadScore);
    const publicReport = stripInternalFromBuyerReport(aiReport);

    const storedQuizData = await finalizeQuizData(quizData, {
      leadType: "buyer",
      quizData,
      leadScore,
      leadTemperature,
      internalLeadSummary: aiReport.internalLeadSummary,
    });

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        lead_type: "buyer",
        first_name: quizData.contact.firstName,
        last_name: quizData.contact.lastName,
        email: quizData.contact.email,
        phone: quizData.contact.phone ?? null,
        preferred_contact_method: quizData.contact.preferredContactMethod,
        consent_given: quizData.contact.consentGiven,
        quiz_data: storedQuizData,
        ai_report: publicReport,
        lead_score: leadScore,
        lead_temperature: leadTemperature,
        internal_lead_summary: aiReport.internalLeadSummary,
        suggested_follow_up_message: aiReport.suggestedFollowUpMessage,
        tenant_id: context.tenantId,
        status: "new",
        report_source: reportSource,
        public_result_token: token,
        user_agent: userAgent,
        ...attributionColumns(attribution),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await recordIntakeDecisionVersion(supabase, lead.id, context.tenantId);

    try {
      await generateAndPersistStrategyRoom(
        supabase,
        lead.id,
        "buyer",
        quizData,
        tenant,
        { tenantId: context.tenantId }
      );
    } catch (strategyError) {
      console.error("[strategy-room] buyer generation failed:", strategyError);
    }

    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "lead_created",
      event_data: {
        leadType: "buyer",
        leadScore,
        leadTemperature,
        token,
        reportSource,
      },
    });

    scheduleNotify(
      lead.id,
      "buyer",
      quizData,
      leadScore,
      leadTemperature,
      aiReport.internalLeadSummary,
      aiReport.suggestedFollowUpMessage,
      storedQuizData.leadConcierge
    );

    await finalizeSiteAnalytics(lead.id, "buyer", request, context);

    return { leadId: lead.id, token, leadType: "buyer" };
  }

  if (request.leadType === "seller") {
    const quizData = {
      leadType: "seller" as const,
      propertyAddress: request.propertyAddress,
      estimatedValueRange: request.estimatedValueRange,
      propertyCondition: request.propertyCondition,
      sellingTimeline: request.sellingTimeline,
      sellerPriority: request.sellerPriority,
      upgrades: request.upgrades,
      freeText: request.freeText,
      contact: request.contact,
      bedrooms: request.bedrooms,
      bathrooms: request.bathrooms,
      squareFeet: request.squareFeet,
      lotSize: request.lotSize,
      yearBuilt: request.yearBuilt,
      propertyType: request.propertyType,
      hoaStatus: request.hoaStatus,
      poolStatus: request.poolStatus,
      garageSpaces: request.garageSpaces,
      notableFeatures: request.notableFeatures,
      recentUpgrades: request.recentUpgrades,
      buyerObjectionConcerns: request.buyerObjectionConcerns,
      viewType: request.viewType,
      waterProximity: request.waterProximity,
      gatedOrPrivateAccess: request.gatedOrPrivateAccess,
      poolSpa: request.poolSpa,
      guestHouse: request.guestHouse,
      elevator: request.elevator,
      outdoorKitchen: request.outdoorKitchen,
      wineRoom: request.wineRoom,
      theater: request.theater,
      gym: request.gym,
      smartHome: request.smartHome,
      architectDesigner: request.architectDesigner,
      photoPrivacyPreference: request.photoPrivacyPreference,
      showingPrivacyPreference: request.showingPrivacyPreference,
      priorListingHistory: request.priorListingHistory,
    };
    const { propertyIntelligence } =
      await prepareSellerPropertyContext(quizData);
    const { report: aiReport, source: reportSource } =
      await generateSellerReport(quizData, propertyIntelligence);
    const leadScore = calculateSellerLeadScore(quizData);
    const leadTemperature = getLeadTemperature(leadScore);
    const publicReport = stripInternalFromSellerReport(aiReport);

    const storedQuizData = await finalizeQuizData(
      { ...quizData, propertyIntelligence },
      {
        leadType: "seller",
        quizData,
        leadScore,
        leadTemperature,
        internalLeadSummary: aiReport.internalLeadSummary,
      }
    );

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        lead_type: "seller",
        first_name: quizData.contact.firstName,
        last_name: quizData.contact.lastName,
        email: quizData.contact.email,
        phone: quizData.contact.phone ?? null,
        preferred_contact_method: quizData.contact.preferredContactMethod,
        consent_given: quizData.contact.consentGiven,
        quiz_data: storedQuizData,
        ai_report: publicReport,
        lead_score: leadScore,
        lead_temperature: leadTemperature,
        internal_lead_summary: aiReport.internalLeadSummary,
        suggested_follow_up_message: aiReport.suggestedFollowUpMessage,
        tenant_id: context.tenantId,
        status: "new",
        report_source: reportSource,
        public_result_token: token,
        user_agent: userAgent,
        ...attributionColumns(attribution),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await recordIntakeDecisionVersion(supabase, lead.id, context.tenantId);

    try {
      await generateAndPersistStrategyRoom(
        supabase,
        lead.id,
        "seller",
        quizData,
        tenant,
        { tenantId: context.tenantId }
      );
    } catch (strategyError) {
      console.error("[strategy-room] seller generation failed:", strategyError);
    }

    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "lead_created",
      event_data: {
        leadType: "seller",
        leadScore,
        leadTemperature,
        token,
        reportSource,
      },
    });

    scheduleNotify(
      lead.id,
      "seller",
      quizData,
      leadScore,
      leadTemperature,
      aiReport.internalLeadSummary,
      aiReport.suggestedFollowUpMessage,
      storedQuizData.leadConcierge
    );

    await finalizeSiteAnalytics(lead.id, "seller", request, context);

    return { leadId: lead.id, token, leadType: "seller" };
  }

  if (request.leadType === "wealth_forecast") {
    const quizData = {
      leadType: "wealth_forecast" as const,
      purchasePrice: request.purchasePrice,
      downPaymentType: request.downPaymentType,
      downPaymentPercent: request.downPaymentPercent,
      downPaymentAmount: request.downPaymentAmount,
      propertyUse: request.propertyUse,
      targetLocations: request.targetLocations,
      holdPeriodYears: request.holdPeriodYears,
      interestRate: request.interestRate,
      propertyTaxRate: request.propertyTaxRate,
      insuranceAnnual: request.insuranceAnnual,
      hoaMonthly: request.hoaMonthly,
      maintenanceRate: request.maintenanceRate,
      liquiditySituation: request.liquiditySituation,
      leveragePreference: request.leveragePreference,
      riskProfile: request.riskProfile,
      monthlyCarryComfort: request.monthlyCarryComfort,
      timeline: request.timeline,
      freeText: request.freeText,
      contact: request.contact,
    };
    const calculations = calculateWealthForecast(quizData);
    const { report: aiReport, source: reportSource } =
      await generateWealthForecastReport(quizData);
    const leadScore = calculateWealthForecastLeadScore(quizData, calculations);
    const leadTemperature = getLeadTemperature(leadScore);
    const publicReport = stripInternalFromWealthForecastReport(aiReport);

    const storedQuizData = await finalizeQuizData(
      { ...quizData, calculations },
      {
        leadType: "wealth_forecast",
        quizData,
        leadScore,
        leadTemperature,
        internalLeadSummary: aiReport.internalLeadSummary,
        wealthCalculations: calculations,
      }
    );

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        lead_type: "wealth_forecast",
        first_name: quizData.contact.firstName,
        last_name: quizData.contact.lastName,
        email: quizData.contact.email,
        phone: quizData.contact.phone ?? null,
        preferred_contact_method: quizData.contact.preferredContactMethod,
        consent_given: quizData.contact.consentGiven,
        quiz_data: storedQuizData,
        ai_report: publicReport,
        lead_score: leadScore,
        lead_temperature: leadTemperature,
        internal_lead_summary: aiReport.internalLeadSummary,
        suggested_follow_up_message: aiReport.suggestedFollowUpMessage,
        tenant_id: context.tenantId,
        status: "new",
        report_source: reportSource,
        public_result_token: token,
        user_agent: userAgent,
        ...attributionColumns(attribution),
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await recordIntakeDecisionVersion(supabase, lead.id, context.tenantId);

    try {
      await generateAndPersistStrategyRoom(
        supabase,
        lead.id,
        "wealth_forecast",
        quizData,
        tenant,
        { tenantId: context.tenantId }
      );
    } catch (strategyError) {
      console.error(
        "[strategy-room] wealth_forecast generation failed:",
        strategyError
      );
    }

    await supabase.from("lead_events").insert({
      lead_id: lead.id,
      event_type: "lead_created",
      event_data: {
        leadType: "wealth_forecast",
        leadScore,
        leadTemperature,
        token,
        reportSource,
      },
    });

    scheduleNotify(
      lead.id,
      "wealth_forecast",
      quizData,
      leadScore,
      leadTemperature,
      aiReport.internalLeadSummary,
      aiReport.suggestedFollowUpMessage,
      storedQuizData.leadConcierge
    );

    await finalizeSiteAnalytics(lead.id, "wealth_forecast", request, context);

    return { leadId: lead.id, token, leadType: "wealth_forecast" };
  }

  const propertyAddress = request.propertyAddress;
  const fullAddress = formatEquityAddress(propertyAddress);
  const equityPropertyIntelligence = await enrichEquityProperty({
    address: fullAddress,
    city: propertyAddress.city,
    state: propertyAddress.state,
    zip: propertyAddress.zip,
    yearPurchased: request.yearPurchased,
    originalPurchasePrice: request.originalPurchasePrice,
    mortgageBalance: request.mortgageBalance,
  });

  const hasRentCastEstimate =
    equityPropertyIntelligence.estimatedValue != null &&
    equityPropertyIntelligence.estimatedValue > 0;
  const currentValueSource = resolveCurrentValueSource(
    request.valueEstimateChoice,
    {
      hasRentCastEstimate,
      hasUserValue:
        request.estimatedCurrentValue != null &&
        request.estimatedCurrentValue > 0,
      userValue: request.estimatedCurrentValue,
      rentCastEstimate: equityPropertyIntelligence.estimatedValue,
    }
  );

  const quizData = {
    leadType: "equity" as const,
    propertyAddress,
    currentHomeCity: propertyAddress.city.trim(),
    currentHomeState: request.currentHomeState ?? "California",
    yearPurchased: request.yearPurchased,
    originalPurchasePrice: request.originalPurchasePrice,
    estimatedCurrentValue: request.estimatedCurrentValue,
    currentValueSource,
    valueEstimateChoice: request.valueEstimateChoice,
    mortgageBalance: request.mortgageBalance,
    estimatedInterestRate: request.estimatedInterestRate,
    estimatedImprovements: request.estimatedImprovements,
    filingStatus: request.filingStatus,
    nextMoveGoal: request.nextMoveGoal,
    desiredNextLocation: request.desiredNextLocation,
    timeline: request.timeline,
    biggestConcern: request.biggestConcern,
    freeText: request.freeText,
    contact: request.contact,
  };
  const calculations = calculateEquityMove(quizData, {
    rentCastEstimatedValue: equityPropertyIntelligence.estimatedValue,
  });
  const quizDataWithResolvedSource = {
    ...quizData,
    currentValueSource: calculations.currentValueSource,
  };
  const { report: aiReport, source: reportSource } = await generateEquityReport(
    quizDataWithResolvedSource,
    equityPropertyIntelligence
  );
  const leadScore = calculateEquityLeadScore(
    quizDataWithResolvedSource,
    calculations
  );
  const leadTemperature = getLeadTemperature(leadScore);
  const publicReport = stripInternalFromEquityReport(aiReport);

  const storedQuizData = await finalizeQuizData(
    { ...quizDataWithResolvedSource, equityPropertyIntelligence },
    {
      leadType: "equity",
      quizData: quizDataWithResolvedSource,
      leadScore,
      leadTemperature,
      internalLeadSummary: aiReport.internalLeadSummary,
      equityCalculations: calculations,
      equityPropertyIntelligence,
    }
  );

  const { data: lead, error } = await supabase
    .from("leads")
    .insert({
      lead_type: "equity",
      first_name: quizData.contact.firstName,
      last_name: quizData.contact.lastName,
      email: quizData.contact.email,
      phone: quizData.contact.phone ?? null,
      preferred_contact_method: quizData.contact.preferredContactMethod,
      consent_given: quizData.contact.consentGiven,
      quiz_data: storedQuizData,
      ai_report: publicReport,
      lead_score: leadScore,
      lead_temperature: leadTemperature,
      internal_lead_summary: aiReport.internalLeadSummary,
      suggested_follow_up_message: aiReport.suggestedFollowUpMessage,
      tenant_id: context.tenantId,
      status: "new",
      report_source: reportSource,
      public_result_token: token,
      user_agent: userAgent,
      ...attributionColumns(attribution),
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await recordIntakeDecisionVersion(supabase, lead.id, context.tenantId);

  try {
    await generateAndPersistStrategyRoom(
      supabase,
      lead.id,
      "equity",
      quizDataWithResolvedSource,
      tenant,
      { tenantId: context.tenantId }
    );
  } catch (strategyError) {
    console.error("[strategy-room] equity generation failed:", strategyError);
  }

  await supabase.from("lead_events").insert({
    lead_id: lead.id,
    event_type: "lead_created",
    event_data: {
      leadType: "equity",
      leadScore,
      leadTemperature,
      token,
      reportSource,
    },
  });

  scheduleNotify(
    lead.id,
    "equity",
    quizData,
    leadScore,
    leadTemperature,
    aiReport.internalLeadSummary,
    aiReport.suggestedFollowUpMessage,
    storedQuizData.leadConcierge
  );

  await finalizeSiteAnalytics(lead.id, "equity", request, context);

  return { leadId: lead.id, token, leadType: "equity" };
}
