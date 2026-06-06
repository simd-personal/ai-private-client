import type { SupabaseClient } from "@supabase/supabase-js";
import { recordIntakeDecisionVersion } from "@/lib/ai/persistDecisionLayer";
import type { LeadType } from "@/lib/ai/intake-context";
import { logGenerationTiming } from "@/lib/ai/generation-timing";
import { buildFastPublicBrief } from "@/lib/report/buildFastPublicBrief";
import type { LeadApiRequest } from "@/lib/schemas/lead-api";
import { initialGenerationColumns } from "@/lib/schemas/lead-generation";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
} from "@/lib/schemas/quiz";
import {
  calculateBuyerLeadScore,
  calculateEquityLeadScore,
  calculateSellerLeadScore,
  calculateWealthForecastLeadScore,
  getLeadTemperature,
} from "@/lib/scoring";
import { calculateEquityMove } from "@/lib/equity/calculateEquityMove";
import { calculateWealthForecast } from "@/lib/wealth/calculateWealthForecast";
import {
  withTestLeadQuizDataMarkers,
} from "@/lib/schemas/test-lead-metadata";
import { withTenantQuizDataMarkers } from "@/lib/tenants/tenant-config";
import type { AttributionData } from "@/lib/schemas/attribution";
import { insertLeadRow } from "@/lib/leads/public-result-query";
import type { ProcessLeadContext, ProcessLeadResult } from "@/lib/leads/process-submission";

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

function storeQuizData<T extends Record<string, unknown>>(
  base: T,
  tenant: ProcessLeadContext["tenant"],
  testMetadata: LeadApiRequest["testMetadata"]
) {
  return withTestLeadQuizDataMarkers(
    withTenantQuizDataMarkers(base, tenant),
    testMetadata
  );
}

async function insertFastLead(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<string> {
  const start = Date.now();
  const leadId = await insertLeadRow(supabase, row);
  logGenerationTiming("lead_insert", { durationMs: Date.now() - start });
  return leadId;
}

function fastBriefPayload(input: {
  leadType: LeadType;
  quizData: Record<string, unknown>;
  tenant: ProcessLeadContext["tenant"];
  firstName: string;
  lastName: string;
}) {
  const start = Date.now();
  const brief = buildFastPublicBrief({
    leadType: input.leadType,
    quizData: input.quizData as Parameters<typeof buildFastPublicBrief>[0]["quizData"],
    tenant: input.tenant,
    firstName: input.firstName,
    lastName: input.lastName,
  });
  const now = new Date().toISOString();
  logGenerationTiming("fast_public_brief", { durationMs: Date.now() - start });
  return {
    fast_public_brief: brief,
    fast_public_brief_generated_at: now,
    public_result_ready_at: now,
  };
}

export async function processLeadSubmissionAsync(
  request: LeadApiRequest,
  context: ProcessLeadContext,
  deps: {
    token: string;
    finalizeSiteAnalytics: (
      leadId: string,
      leadType: ProcessLeadResult["leadType"]
    ) => Promise<void>;
  }
): Promise<ProcessLeadResult> {
  const { tenant, tenantId, userAgent } = context;
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  const db = getSupabaseAdmin();
  const token = deps.token;
  const attribution = request.attribution;
  const testMetadata = request.testMetadata;
  const generation = initialGenerationColumns();

  const commonInsert = {
    tenant_id: tenantId,
    status: "new" as const,
    public_result_token: token,
    user_agent: userAgent,
    ai_report: null,
    internal_lead_summary: "Private brief generation in progress.",
    suggested_follow_up_message:
      "Advisor follow-up will be prepared once the brief is ready.",
    report_source: null,
    ...generation,
    ...attributionColumns(attribution),
  };

  if (request.leadType === "buyer") {
    const quizData: BuyerQuizData = {
      leadType: "buyer",
      desiredLocations: request.desiredLocations,
      budgetRange: request.budgetRange,
      propertyType: request.propertyType,
      lifestylePriorities: request.lifestylePriorities,
      timeline: request.timeline,
      financingStatus: request.financingStatus,
      freeText: request.freeText,
      contact: request.contact,
    };
    const leadScore = calculateBuyerLeadScore(quizData);
    const leadTemperature = getLeadTemperature(leadScore);
    const storedQuizData = storeQuizData(quizData, tenant, testMetadata);

    const leadId = await insertFastLead(db, {
      lead_type: "buyer",
      first_name: quizData.contact.firstName,
      last_name: quizData.contact.lastName,
      email: quizData.contact.email,
      phone: quizData.contact.phone ?? null,
      preferred_contact_method: quizData.contact.preferredContactMethod,
      consent_given: quizData.contact.consentGiven,
      quiz_data: storedQuizData,
      lead_score: leadScore,
      lead_temperature: leadTemperature,
      ...commonInsert,
      ...fastBriefPayload({
        leadType: "buyer",
        quizData: storedQuizData,
        tenant,
        firstName: quizData.contact.firstName,
        lastName: quizData.contact.lastName,
      }),
    });

    await recordIntakeDecisionVersion(db, leadId, tenantId);
    await db.from("lead_events").insert({
      lead_id: leadId,
      event_type: "lead_created",
      event_data: {
        leadType: "buyer",
        leadScore,
        leadTemperature,
        token,
        async: true,
      },
    });
    await deps.finalizeSiteAnalytics(leadId, "buyer");

    return {
      leadId,
      token,
      leadType: "buyer",
      generationStatus: "intake_received",
      scheduleBackground: true,
    };
  }

  if (request.leadType === "seller") {
    const quizData: SellerQuizData = {
      leadType: "seller",
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
    const leadScore = calculateSellerLeadScore(quizData);
    const leadTemperature = getLeadTemperature(leadScore);
    const storedQuizData = storeQuizData(quizData, tenant, testMetadata);

    const leadId = await insertFastLead(db, {
      lead_type: "seller",
      first_name: quizData.contact.firstName,
      last_name: quizData.contact.lastName,
      email: quizData.contact.email,
      phone: quizData.contact.phone ?? null,
      preferred_contact_method: quizData.contact.preferredContactMethod,
      consent_given: quizData.contact.consentGiven,
      quiz_data: storedQuizData,
      lead_score: leadScore,
      lead_temperature: leadTemperature,
      ...commonInsert,
      ...fastBriefPayload({
        leadType: "seller",
        quizData: storedQuizData,
        tenant,
        firstName: quizData.contact.firstName,
        lastName: quizData.contact.lastName,
      }),
    });

    await recordIntakeDecisionVersion(db, leadId, tenantId);
    await db.from("lead_events").insert({
      lead_id: leadId,
      event_type: "lead_created",
      event_data: { leadType: "seller", leadScore, leadTemperature, token, async: true },
    });
    await deps.finalizeSiteAnalytics(leadId, "seller");

    return {
      leadId,
      token,
      leadType: "seller",
      generationStatus: "intake_received",
      scheduleBackground: true,
    };
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
    const leadScore = calculateWealthForecastLeadScore(quizData, calculations);
    const leadTemperature = getLeadTemperature(leadScore);
    const storedQuizData = storeQuizData(
      { ...quizData, calculations },
      tenant,
      testMetadata
    );

    const leadId = await insertFastLead(db, {
      lead_type: "wealth_forecast",
      first_name: quizData.contact.firstName,
      last_name: quizData.contact.lastName,
      email: quizData.contact.email,
      phone: quizData.contact.phone ?? null,
      preferred_contact_method: quizData.contact.preferredContactMethod,
      consent_given: quizData.contact.consentGiven,
      quiz_data: storedQuizData,
      lead_score: leadScore,
      lead_temperature: leadTemperature,
      ...commonInsert,
      ...fastBriefPayload({
        leadType: "wealth_forecast",
        quizData: storedQuizData,
        tenant,
        firstName: quizData.contact.firstName,
        lastName: quizData.contact.lastName,
      }),
    });

    await recordIntakeDecisionVersion(db, leadId, tenantId);
    await db.from("lead_events").insert({
      lead_id: leadId,
      event_type: "lead_created",
      event_data: {
        leadType: "wealth_forecast",
        leadScore,
        leadTemperature,
        token,
        async: true,
      },
    });
    await deps.finalizeSiteAnalytics(leadId, "wealth_forecast");

    return {
      leadId,
      token,
      leadType: "wealth_forecast",
      generationStatus: "intake_received",
      scheduleBackground: true,
    };
  }

  const propertyAddress = request.propertyAddress;
  const quizData: EquityQuizData = {
    leadType: "equity",
    propertyAddress,
    currentHomeCity: propertyAddress.city.trim(),
    currentHomeState: request.currentHomeState ?? "California",
    yearPurchased: request.yearPurchased,
    originalPurchasePrice: request.originalPurchasePrice,
    estimatedCurrentValue: request.estimatedCurrentValue,
    currentValueSource: request.currentValueSource,
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
  const calculations = calculateEquityMove(quizData);
  const leadScore = calculateEquityLeadScore(
    { ...quizData, currentValueSource: calculations.currentValueSource },
    calculations
  );
  const leadTemperature = getLeadTemperature(leadScore);
  const storedQuizData = storeQuizData(
    {
      ...quizData,
      currentValueSource: calculations.currentValueSource,
      calculations,
    },
    tenant,
    testMetadata
  );

  const leadId = await insertFastLead(db, {
    lead_type: "equity",
    first_name: quizData.contact.firstName,
    last_name: quizData.contact.lastName,
    email: quizData.contact.email,
    phone: quizData.contact.phone ?? null,
    preferred_contact_method: quizData.contact.preferredContactMethod,
    consent_given: quizData.contact.consentGiven,
    quiz_data: storedQuizData,
    lead_score: leadScore,
    lead_temperature: leadTemperature,
    ...commonInsert,
    ...fastBriefPayload({
      leadType: "equity",
      quizData: storedQuizData,
      tenant,
      firstName: quizData.contact.firstName,
      lastName: quizData.contact.lastName,
    }),
  });

  await recordIntakeDecisionVersion(db, leadId, tenantId);
  await db.from("lead_events").insert({
    lead_id: leadId,
    event_type: "lead_created",
    event_data: { leadType: "equity", leadScore, leadTemperature, token, async: true },
  });
  await deps.finalizeSiteAnalytics(leadId, "equity");

  return {
    leadId,
    token,
    leadType: "equity",
    generationStatus: "intake_received",
    scheduleBackground: true,
  };
}
