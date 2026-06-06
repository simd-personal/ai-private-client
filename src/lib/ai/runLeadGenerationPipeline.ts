import { generateBuyerReport, generateSellerReport } from "@/lib/ai/generateReport";
import { generateEquityReport } from "@/lib/ai/generateEquityReport";
import { generateWealthForecastReport } from "@/lib/ai/generateWealthForecastReport";
import type { LeadConciergeInput } from "@/lib/ai/buildLeadConciergeFallback";
import { buildLeadConciergeFallback } from "@/lib/ai/buildLeadConciergeFallback";
import { generateLeadConcierge } from "@/lib/ai/generateLeadConcierge";
import { buildIntakeContext, type LeadType } from "@/lib/ai/intake-context";
import {
  markLeadGenerationComplete,
  markLeadGenerationFailed,
  markLeadGenerationStarted,
  updateLeadGenerationStage,
} from "@/lib/ai/lead-generation-status";
import { generateAndPersistAdvisorActionBoard } from "@/lib/ai/persistAdvisorActionBoard";
import { persistDecisionLayer } from "@/lib/ai/persistDecisionLayer";
import {
  generateStrategyRoom,
  strategyRoomToDbColumns,
} from "@/lib/ai/generateStrategyRoom";
import { sendLeadNotificationEmail } from "@/lib/notifications/email";
import { maybeSendLeadSmsNotification } from "@/lib/notifications/sms";
import { enrichEquityProperty } from "@/lib/property/enrichEquityProperty";
import {
  formatEquityAddress,
  resolveCurrentValueSource,
  type EquityPropertyIntelligence,
} from "@/lib/property/equityPropertyTypes";
import { prepareSellerPropertyContext } from "@/lib/property/prepareSellerPropertyContext";
import type { SellerQuizDataWithIntelligence } from "@/lib/property/types";
import {
  stripInternalFromBuyerReport,
  stripInternalFromEquityReport,
  stripInternalFromSellerReport,
  stripInternalFromWealthForecastReport,
} from "@/lib/schemas/ai-report";
import type { LeadConcierge } from "@/lib/schemas/lead-concierge";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import { shouldSuppressTestNotifications } from "@/lib/schemas/test-lead-metadata";
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
import type { TenantConfig } from "@/lib/tenants/tenant-config";
import {
  trackLeadGenerationComplete,
  trackLeadGenerationFailed,
  trackLeadGenerationStageReady,
  trackLeadGenerationStarted,
} from "@/lib/analytics";
import {
  timeGenerationStage,
} from "@/lib/ai/generation-timing";

type PipelineQuizData =
  | BuyerQuizData
  | SellerQuizDataWithIntelligence
  | (EquityQuizData & {
      equityPropertyIntelligence?: EquityPropertyIntelligence;
      calculations?: ReturnType<typeof calculateEquityMove>;
    })
  | (WealthQuizData & {
      calculations?: ReturnType<typeof calculateWealthForecast>;
    });

export interface RunLeadGenerationPipelineInput {
  leadId: string;
  tenantId: string | null;
  tenant: TenantConfig;
  mode?: "background" | "sync";
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

async function notifyLeadFromRow(
  lead: {
    id: string;
    lead_type: LeadType;
    lead_score: number;
    lead_temperature: string;
    internal_lead_summary: string;
    suggested_follow_up_message: string;
    quiz_data: unknown;
  },
  tenant: TenantConfig
): Promise<void> {
  const quizData = lead.quiz_data as
    | BuyerQuizData
    | SellerQuizData
    | EquityQuizData
    | WealthQuizData;
  const suppress = shouldSuppressTestNotifications(
    (quizData as { testMetadata?: unknown }).testMetadata as
      | Parameters<typeof shouldSuppressTestNotifications>[0]
      | undefined
  );
  if (suppress) return;

  const contact = quizData.contact;
  const leadConcierge =
    (quizData as { leadConcierge?: LeadConcierge }).leadConcierge ?? null;

  await Promise.all([
    sendLeadNotificationEmail({
      leadId: lead.id,
      leadType: lead.lead_type,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone ?? null,
      preferredContactMethod: contact.preferredContactMethod,
      leadScore: lead.lead_score,
      leadTemperature: lead.lead_temperature as "cold" | "warm" | "hot",
      quizData,
      internalLeadSummary: lead.internal_lead_summary,
      suggestedFollowUpMessage: lead.suggested_follow_up_message,
      leadConcierge,
      tenant,
    }),
    maybeSendLeadSmsNotification({
      leadId: lead.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      phone: contact.phone ?? null,
      leadTemperature: lead.lead_temperature as "cold" | "warm" | "hot",
      leadScore: lead.lead_score,
    }),
  ]);
}

export async function runLeadGenerationPipeline(
  input: RunLeadGenerationPipelineInput
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { leadId, tenantId, tenant } = input;

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (error || !lead) {
    console.error("[generation-pipeline] lead not found:", leadId);
    return;
  }

  await markLeadGenerationStarted(supabase, leadId);
  trackLeadGenerationStarted({ lead_id: leadId });

  const leadType = lead.lead_type as LeadType;
  let quizData = lead.quiz_data as PipelineQuizData;

  try {
    if (leadType === "seller") {
      const sellerQuiz = quizData as SellerQuizDataWithIntelligence;
      if (!sellerQuiz.propertyIntelligence) {
        const { propertyIntelligence } =
          await prepareSellerPropertyContext(sellerQuiz);
        quizData = { ...sellerQuiz, propertyIntelligence };
        await supabase
          .from("leads")
          .update({ quiz_data: quizData })
          .eq("id", leadId);
      }
    }

    if (leadType === "equity") {
      const equityQuiz = quizData as EquityQuizData & {
        equityPropertyIntelligence?: EquityPropertyIntelligence;
      };
      if (!equityQuiz.equityPropertyIntelligence) {
        const propertyAddress = equityQuiz.propertyAddress;
        const fullAddress = formatEquityAddress(propertyAddress);
        const equityPropertyIntelligence = await enrichEquityProperty({
          address: fullAddress,
          city: propertyAddress.city,
          state: propertyAddress.state,
          zip: propertyAddress.zip,
          yearPurchased: equityQuiz.yearPurchased,
          originalPurchasePrice: equityQuiz.originalPurchasePrice,
          mortgageBalance: equityQuiz.mortgageBalance,
        });
        const hasRentCastEstimate =
          equityPropertyIntelligence.estimatedValue != null &&
          equityPropertyIntelligence.estimatedValue > 0;
        const currentValueSource = resolveCurrentValueSource(
          equityQuiz.valueEstimateChoice,
          {
            hasRentCastEstimate,
            hasUserValue:
              equityQuiz.estimatedCurrentValue != null &&
              equityQuiz.estimatedCurrentValue > 0,
            userValue: equityQuiz.estimatedCurrentValue,
            rentCastEstimate: equityPropertyIntelligence.estimatedValue,
          }
        );
        quizData = {
          ...equityQuiz,
          currentValueSource,
          equityPropertyIntelligence,
        };
        await supabase
          .from("leads")
          .update({ quiz_data: quizData })
          .eq("id", leadId);
      }
    }

    if (leadType === "wealth_forecast") {
      const wealthQuiz = quizData as WealthQuizData & {
        calculations?: ReturnType<typeof calculateWealthForecast>;
      };
      if (!wealthQuiz.calculations) {
        quizData = {
          ...wealthQuiz,
          calculations: calculateWealthForecast(wealthQuiz),
        };
        await supabase
          .from("leads")
          .update({ quiz_data: quizData })
          .eq("id", leadId);
      }
    }

    await updateLeadGenerationStage(supabase, leadId, "base_report", "running");

    let reportSource: "openai" | "fallback" = "fallback";
    let leadScore = lead.lead_score ?? 0;
    let leadTemperature = (lead.lead_temperature ?? "cold") as
      | "cold"
      | "warm"
      | "hot";
    let internalLeadSummary = lead.internal_lead_summary ?? "";
    let suggestedFollowUp = lead.suggested_follow_up_message ?? "";
    let publicReport: Record<string, unknown>;

    try {
      if (leadType === "buyer") {
        const q = quizData as BuyerQuizData;
        const generated = await generateBuyerReport(q);
        reportSource = generated.source;
        leadScore = calculateBuyerLeadScore(q);
        leadTemperature = getLeadTemperature(leadScore);
        internalLeadSummary = generated.report.internalLeadSummary;
        suggestedFollowUp = generated.report.suggestedFollowUpMessage;
        publicReport = stripInternalFromBuyerReport(generated.report);
      } else if (leadType === "seller") {
        const q = quizData as SellerQuizDataWithIntelligence;
        const generated = await generateSellerReport(
          q,
          q.propertyIntelligence ?? null
        );
        reportSource = generated.source;
        leadScore = calculateSellerLeadScore(q);
        leadTemperature = getLeadTemperature(leadScore);
        internalLeadSummary = generated.report.internalLeadSummary;
        suggestedFollowUp = generated.report.suggestedFollowUpMessage;
        publicReport = stripInternalFromSellerReport(generated.report);
      } else if (leadType === "wealth_forecast") {
        const q = quizData as WealthQuizData & {
          calculations: ReturnType<typeof calculateWealthForecast>;
        };
        const calculations =
          q.calculations ?? calculateWealthForecast(q);
        const generated = await generateWealthForecastReport(q);
        reportSource = generated.source;
        leadScore = calculateWealthForecastLeadScore(q, calculations);
        leadTemperature = getLeadTemperature(leadScore);
        internalLeadSummary = generated.report.internalLeadSummary;
        suggestedFollowUp = generated.report.suggestedFollowUpMessage;
        publicReport = stripInternalFromWealthForecastReport(generated.report);
      } else {
        const q = quizData as EquityQuizData & {
          equityPropertyIntelligence?: Awaited<
            ReturnType<typeof enrichEquityProperty>
          >;
        };
        const calculations = calculateEquityMove(q, {
          rentCastEstimatedValue: q.equityPropertyIntelligence?.estimatedValue,
        });
        const qWithSource = {
          ...q,
          currentValueSource: calculations.currentValueSource,
        };
        const generated = await generateEquityReport(
          qWithSource,
          q.equityPropertyIntelligence ?? null
        );
        reportSource = generated.source;
        leadScore = calculateEquityLeadScore(qWithSource, calculations);
        leadTemperature = getLeadTemperature(leadScore);
        internalLeadSummary = generated.report.internalLeadSummary;
        suggestedFollowUp = generated.report.suggestedFollowUpMessage;
        publicReport = stripInternalFromEquityReport(generated.report);
        quizData = { ...qWithSource, calculations };
      }

      await supabase
        .from("leads")
        .update({
          ai_report: publicReport,
          quiz_data: quizData,
          lead_score: leadScore,
          lead_temperature: leadTemperature,
          internal_lead_summary: internalLeadSummary,
          suggested_follow_up_message: suggestedFollowUp,
          report_source: reportSource,
        })
        .eq("id", leadId);

      await updateLeadGenerationStage(supabase, leadId, "base_report", "ready");
      trackLeadGenerationStageReady({ lead_id: leadId, stage: "base_report" });
    } catch (reportError) {
      console.error("[generation-pipeline] base report failed:", reportError);
      await updateLeadGenerationStage(supabase, leadId, "base_report", "failed", {
        error: reportError instanceof Error ? reportError.message : "Report failed",
      });
      trackLeadGenerationFailed({
        lead_id: leadId,
        stage: "base_report",
      });
    }

    await updateLeadGenerationStage(supabase, leadId, "strategy_room", "running");

    try {
      const ctx = buildIntakeContext(leadType, quizData);
      const { output, source, model } = await timeGenerationStage(
        "strategy_room",
        () => generateStrategyRoom(ctx, tenant)
      );
      const columns = strategyRoomToDbColumns(output, { source, model });

      const { error: strategyError } = await supabase
        .from("leads")
        .update(columns)
        .eq("id", leadId);

      if (strategyError) throw new Error(strategyError.message);

      await updateLeadGenerationStage(
        supabase,
        leadId,
        "strategy_room",
        "ready"
      );
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "presentation",
        "ready"
      );
      trackLeadGenerationStageReady({
        lead_id: leadId,
        stage: "strategy_room",
      });

      await updateLeadGenerationStage(
        supabase,
        leadId,
        "decision_layer",
        "running"
      );

      try {
        await persistDecisionLayer(
          supabase,
          leadId,
          tenantId,
          ctx,
          output,
          { source, changeSource: "lead_generation_pipeline" }
        );
        await updateLeadGenerationStage(
          supabase,
          leadId,
          "decision_layer",
          "ready"
        );
        trackLeadGenerationStageReady({
          lead_id: leadId,
          stage: "decision_layer",
        });
      } catch (decisionError) {
        console.error("[generation-pipeline] decision layer failed:", decisionError);
        await updateLeadGenerationStage(
          supabase,
          leadId,
          "decision_layer",
          "failed",
          {
            error:
              decisionError instanceof Error
                ? decisionError.message
                : "Decision layer failed",
          }
        );
      }

      await updateLeadGenerationStage(
        supabase,
        leadId,
        "advisor_action_board",
        "running"
      );

      try {
        await generateAndPersistAdvisorActionBoard(supabase, leadId, {
          tenantId,
          changeSource: "lead_generation_pipeline",
        });
        await updateLeadGenerationStage(
          supabase,
          leadId,
          "advisor_action_board",
          "ready"
        );
        trackLeadGenerationStageReady({
          lead_id: leadId,
          stage: "advisor_action_board",
        });
      } catch (boardError) {
        console.error("[generation-pipeline] action board failed:", boardError);
        await updateLeadGenerationStage(
          supabase,
          leadId,
          "advisor_action_board",
          "failed",
          {
            error:
              boardError instanceof Error
                ? boardError.message
                : "Action board failed",
          }
        );
      }
    } catch (strategyError) {
      console.error("[generation-pipeline] strategy room failed:", strategyError);
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "strategy_room",
        "failed",
        {
          error:
            strategyError instanceof Error
              ? strategyError.message
              : "Strategy room failed",
        }
      );
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "presentation",
        "failed"
      );
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "decision_layer",
        "skipped"
      );
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "advisor_action_board",
        "skipped"
      );
    }

    await updateLeadGenerationStage(supabase, leadId, "lead_concierge", "running");

    try {
      const conciergeInput: LeadConciergeInput = {
        leadType,
        quizData,
        leadScore,
        leadTemperature,
        internalLeadSummary,
        ...(leadType === "wealth_forecast"
          ? {
              wealthCalculations: (quizData as WealthQuizData & {
                calculations?: ReturnType<typeof calculateWealthForecast>;
              }).calculations,
            }
          : {}),
        ...(leadType === "equity"
          ? {
              equityCalculations: (quizData as EquityQuizData & {
                calculations?: ReturnType<typeof calculateEquityMove>;
              }).calculations,
              equityPropertyIntelligence: (
                quizData as EquityQuizData & {
                  equityPropertyIntelligence?: Awaited<
                    ReturnType<typeof enrichEquityProperty>
                  >;
                }
              ).equityPropertyIntelligence,
            }
          : {}),
      };

      const withConcierge = await timeGenerationStage("lead_concierge", () =>
        attachLeadConcierge(quizData as Record<string, unknown>, conciergeInput)
      );
      quizData = withConcierge as unknown as PipelineQuizData;

      await supabase
        .from("leads")
        .update({ quiz_data: quizData })
        .eq("id", leadId);

      await updateLeadGenerationStage(
        supabase,
        leadId,
        "lead_concierge",
        "ready"
      );
      trackLeadGenerationStageReady({
        lead_id: leadId,
        stage: "lead_concierge",
      });
    } catch (conciergeError) {
      console.error("[generation-pipeline] concierge failed:", conciergeError);
      await updateLeadGenerationStage(
        supabase,
        leadId,
        "lead_concierge",
        "failed",
        {
          error:
            conciergeError instanceof Error
              ? conciergeError.message
              : "Concierge failed",
        }
      );
    }

    const { data: updatedLead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (updatedLead) {
      await notifyLeadFromRow(
        updatedLead as {
          id: string;
          lead_type: LeadType;
          lead_score: number;
          lead_temperature: string;
          internal_lead_summary: string;
          suggested_follow_up_message: string;
          quiz_data: unknown;
        },
        tenant
      ).catch((err) => console.error("[generation-pipeline] notify failed:", err));
    }

    await markLeadGenerationComplete(supabase, leadId);
    trackLeadGenerationComplete({ lead_id: leadId });
  } catch (fatalError) {
    console.error("[generation-pipeline] fatal:", fatalError);
    await markLeadGenerationFailed(
      supabase,
      leadId,
      "base_report",
      fatalError instanceof Error ? fatalError.message : "Generation failed"
    );
    trackLeadGenerationFailed({ lead_id: leadId, stage: "pipeline" });
  }
}

export function scheduleLeadGenerationPipeline(
  input: RunLeadGenerationPipelineInput
): void {
  /**
   * Fire-and-forget for local/demo and serverless after-response scheduling.
   * Production can later move this to Supabase Edge Functions, a queue, or Inngest.
   */
  void runLeadGenerationPipeline(input).catch((error) => {
    console.error("[generation-pipeline] background error:", error);
  });
}
