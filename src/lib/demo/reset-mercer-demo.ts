import { readFileSync } from "fs";
import { join } from "path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateEquityReport } from "@/lib/ai/generateEquityReport";
import { generateAndPersistStrategyRoom } from "@/lib/ai/persistStrategyRoom";
import { recordIntakeDecisionVersion } from "@/lib/ai/persistDecisionLayer";
import {
  buildMercerDemoUrls,
  deleteMercerDemoLeads,
  MERCER_DEMO_SCENARIO,
  MERCER_DEMO_SLUG,
  upsertMercerDemoTenant,
} from "@/lib/demo/mercer-demo-tenant";
import { stripInternalFromEquityReport } from "@/lib/schemas/ai-report";
import { equityQuizSchema, type EquityQuizData } from "@/lib/schemas/quiz";
import { calculateEquityLeadScore, getLeadTemperature } from "@/lib/scoring";
import { calculateEquityMove } from "@/lib/equity/calculateEquityMove";
import { generatePublicResultToken } from "@/lib/tokens";
import { withTenantQuizDataMarkers } from "@/lib/tenants/tenant-config";
import { complianceGuardrailsSchema } from "@/lib/schemas/decision-layer";
import { dealReadinessSchema } from "@/lib/schemas/ai-strategy-room";

export interface MercerDemoResetResult {
  tenantSlug: string;
  leadId: string;
  token: string;
  publicResultUrl: string;
  adminLeadUrl: string;
  presentationUrl: string;
  landingUrl: string;
  aiGenerationSource: string | null;
  aiGenerationModel: string | null;
  aiGeneratedAt: string | null;
  readinessScore: number | null;
  guardrailsStatus: string | null;
  dataRoomItemCount: number;
  decisionStage: string | null;
  deletedLeadCount: number;
}

export function loadMercerDemoFixture(): EquityQuizData & {
  demoScenario: string;
  demoTenantSlug: string;
  demoLabel: string;
  privateClientContext: Record<string, unknown>;
} {
  const path = join(process.cwd(), "scripts", "fixtures", "mercer-newport-demo.json");
  const raw = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  const parsed = equityQuizSchema.parse(raw);
  return {
    ...parsed,
    demoScenario: String(raw.demoScenario ?? MERCER_DEMO_SCENARIO),
    demoTenantSlug: String(raw.demoTenantSlug ?? MERCER_DEMO_SLUG),
    demoLabel: String(raw.demoLabel ?? "Mercer Newport Demo"),
    privateClientContext: (raw.privateClientContext ?? {}) as Record<string, unknown>,
  };
}

export async function resetMercerNewportDemo(
  supabase: SupabaseClient,
  options?: { siteUrl?: string; skipAi?: boolean }
): Promise<MercerDemoResetResult> {
  const siteUrl =
    options?.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    "http://localhost:3000";

  const { tenantId, tenant } = await upsertMercerDemoTenant(supabase);
  const deletedLeadCount = await deleteMercerDemoLeads(supabase, tenantId);

  const fixture = loadMercerDemoFixture();
  const calculations = calculateEquityMove(fixture);
  const token = generatePublicResultToken();
  let leadScore = calculateEquityLeadScore(fixture, calculations);

  let aiReport = stripInternalFromEquityReport({
    reportTitle: "Private Client Equity Planning Brief (Demo)",
    publicSummary:
      "Demo scenario for advisor review: transition from Aspen to Newport Beach with privacy-first coordination.",
    valueEstimateBasis: {
      currentValueSource: "user_adjusted",
      estimatedValue: fixture.estimatedCurrentValue ?? null,
      comparableCount: null,
      confidence: "planning estimate",
      dataSources: ["client-provided"],
      basisNote: "Demo planning estimate — not a valuation.",
    },
    equitySnapshot: {
      estimatedAppreciation: null,
      grossEquity: calculations.grossEquity,
      ownershipYears: calculations.ownershipYears,
      moveCategory: "relocate",
    },
    saleScenario: {
      estimatedNetBeforeTaxLow: null,
      estimatedNetBeforeTaxHigh: null,
      sellingCostRange: "To be confirmed with licensed agent",
      potentialTaxableGainEstimate: null,
    },
    taxPlanningNote: "CPA review recommended for planning topics.",
    nextMoveStrategy: "Coordinate advisor review before execution.",
    readinessScore: leadScore,
    recommendedNextStep: "Schedule advisor review to confirm planning topics.",
    questionsForJustin: [],
    internalLeadSummary:
      "Demo lead — Aspen to Newport Beach private property transition.",
    suggestedFollowUpMessage:
      "Demo follow-up for advisor coordination review only.",
  });

  let reportSource: "openai" | "fallback" = "fallback";
  let internalLeadSummary =
    "Demo lead — Aspen to Newport Beach private property transition.";
  let suggestedFollowUp =
    "Demo follow-up for advisor coordination review only.";

  if (!options?.skipAi) {
    const generated = await generateEquityReport(fixture);
    aiReport = stripInternalFromEquityReport(generated.report);
    reportSource = generated.source;
    leadScore = generated.leadScore;
    internalLeadSummary = generated.report.internalLeadSummary;
    suggestedFollowUp = generated.report.suggestedFollowUpMessage;
  }

  const leadTemperature = getLeadTemperature(leadScore);

  const storedQuizData = withTenantQuizDataMarkers(
    {
      ...fixture,
      demoScenario: MERCER_DEMO_SCENARIO,
      demoTenantSlug: MERCER_DEMO_SLUG,
      demoLabel:
        "Mercer Newport Demo — example workflow (Demo only; not affiliated with Mercer Advisors)",
      calculations,
      suppressNotifications: true,
      isDemoLead: true,
    },
    tenant
  );

  const { data: lead, error: insertError } = await supabase
    .from("leads")
    .insert({
      lead_type: "equity",
      first_name: fixture.contact.firstName,
      last_name: fixture.contact.lastName,
      email: fixture.contact.email,
      phone: fixture.contact.phone ?? null,
      preferred_contact_method: fixture.contact.preferredContactMethod,
      consent_given: fixture.contact.consentGiven,
      quiz_data: storedQuizData,
      ai_report: aiReport,
      lead_score: leadScore,
      lead_temperature: leadTemperature,
      internal_lead_summary: internalLeadSummary,
      suggested_follow_up_message: suggestedFollowUp,
      tenant_id: tenantId,
      status: "new",
      report_source: reportSource,
      public_result_token: token,
      user_agent: "mercer-demo-reset",
    })
    .select("id")
    .single();

  if (insertError || !lead) {
    throw new Error(insertError?.message ?? "Failed to insert demo lead");
  }

  const leadId = lead.id as string;

  await recordIntakeDecisionVersion(supabase, leadId, tenantId);

  if (!options?.skipAi) {
    try {
      await generateAndPersistStrategyRoom(
        supabase,
        leadId,
        "equity",
        fixture,
        tenant,
        { tenantId, changeSource: "demo_reset" }
      );
    } catch (error) {
      console.error("[mercer-demo] strategy room generation failed:", error);
    }
  }

  const { data: updatedLead } = await supabase
    .from("leads")
    .select(
      "ai_generation_source, ai_generation_model, ai_generated_at, ai_deal_readiness, ai_compliance_guardrails, decision_stage"
    )
    .eq("id", leadId)
    .single();

  const { count: dataRoomItemCount } = await supabase
    .from("decision_data_room_items")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId);

  const readiness = dealReadinessSchema.safeParse(updatedLead?.ai_deal_readiness);
  const guardrails = complianceGuardrailsSchema.safeParse(
    updatedLead?.ai_compliance_guardrails
  );

  const urls = buildMercerDemoUrls(leadId, token, siteUrl);

  return {
    tenantSlug: MERCER_DEMO_SLUG,
    leadId,
    token,
    ...urls,
    aiGenerationSource: updatedLead?.ai_generation_source ?? null,
    aiGenerationModel: updatedLead?.ai_generation_model ?? null,
    aiGeneratedAt: updatedLead?.ai_generated_at ?? null,
    readinessScore: readiness.success ? readiness.data.readinessScore : null,
    guardrailsStatus: guardrails.success ? guardrails.data.overallStatus : null,
    dataRoomItemCount: dataRoomItemCount ?? 0,
    decisionStage: updatedLead?.decision_stage ?? null,
    deletedLeadCount,
  };
}

export async function getLatestMercerDemoLead(supabase: SupabaseClient) {
  const { tenantId } = await upsertMercerDemoTenant(supabase);

  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, public_result_token, ai_generation_source, ai_generation_model, ai_generated_at, ai_deal_readiness, ai_compliance_guardrails, decision_stage, quiz_data"
    )
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  const lead = leads?.find(
    (row) =>
      (row.quiz_data as { demoScenario?: string } | null)?.demoScenario ===
      MERCER_DEMO_SCENARIO
  );

  if (!lead?.public_result_token) return null;

  const { count: dataRoomItemCount } = await supabase
    .from("decision_data_room_items")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", lead.id);

  const readiness = dealReadinessSchema.safeParse(lead.ai_deal_readiness);
  const guardrails = complianceGuardrailsSchema.safeParse(
    lead.ai_compliance_guardrails
  );

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "http://localhost:3000";
  const urls = buildMercerDemoUrls(
    lead.id as string,
    lead.public_result_token as string,
    siteUrl
  );

  return {
    tenantSlug: MERCER_DEMO_SLUG,
    leadId: lead.id as string,
    token: lead.public_result_token as string,
    ...urls,
    aiGenerationSource: lead.ai_generation_source as string | null,
    aiGenerationModel: lead.ai_generation_model as string | null,
    aiGeneratedAt: lead.ai_generated_at as string | null,
    readinessScore: readiness.success ? readiness.data.readinessScore : null,
    guardrailsStatus: guardrails.success ? guardrails.data.overallStatus : null,
    dataRoomItemCount: dataRoomItemCount ?? 0,
    decisionStage: lead.decision_stage as string | null,
  };
}
