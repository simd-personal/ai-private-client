import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIntakeContext } from "@/lib/ai/intake-context";
import {
  generateStrategyRoom,
  strategyRoomToDbColumns,
} from "@/lib/ai/generateStrategyRoom";
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
  tenant: TenantConfig
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
}

export async function regenerateStrategyRoomForLead(
  supabase: SupabaseClient,
  lead: {
    id: string;
    lead_type: LeadType;
    quiz_data: unknown;
  },
  tenant: TenantConfig
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
    tenant
  );
}
