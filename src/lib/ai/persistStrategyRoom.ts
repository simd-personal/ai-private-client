import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIntakeContext } from "@/lib/ai/intake-context";
import {
  generateStrategyRoom,
  strategyRoomToDbColumns,
} from "@/lib/ai/generateStrategyRoom";
import { persistDecisionLayer } from "@/lib/ai/persistDecisionLayer";
import type { LeadType } from "@/lib/ai/intake-context";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import type { TenantConfig } from "@/lib/tenants/tenant-config";

export async function generateAndPersistStrategyRoom(
  supabase: SupabaseClient,
  leadId: string,
  leadType: LeadType,
  quizData: BuyerQuizData | SellerQuizData | EquityQuizData | WealthQuizData,
  tenant: TenantConfig,
  options?: { tenantId?: string | null; changeSource?: string }
): Promise<void> {
  const ctx = buildIntakeContext(leadType, quizData);
  const { output, source, model } = await generateStrategyRoom(ctx, tenant);
  const columns = strategyRoomToDbColumns(output, { source, model });

  const { error } = await supabase
    .from("leads")
    .update(columns)
    .eq("id", leadId);

  if (error) {
    console.error("[strategy-room] Failed to persist:", error);
    throw new Error(error.message);
  }

  try {
    await persistDecisionLayer(supabase, leadId, options?.tenantId ?? null, ctx, output, {
      source,
      changeSource: options?.changeSource ?? "ai_generated",
    });
  } catch (decisionError) {
    console.error("[decision-layer] Failed to persist:", decisionError);
  }
}

export async function regenerateStrategyRoomForLead(
  supabase: SupabaseClient,
  lead: {
    id: string;
    lead_type: LeadType;
    quiz_data: unknown;
  },
  tenant: TenantConfig,
  options?: { tenantId?: string | null }
) {
  const quizData = lead.quiz_data as
    | BuyerQuizData
    | SellerQuizData
    | EquityQuizData
    | WealthQuizData;

  await generateAndPersistStrategyRoom(
    supabase,
    lead.id,
    lead.lead_type,
    quizData,
    tenant,
    { tenantId: options?.tenantId ?? null, changeSource: "regenerate_ai" }
  );
}
