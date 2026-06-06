import type { SupabaseClient } from "@supabase/supabase-js";
import { buildComplianceGuardrails } from "@/lib/ai/buildComplianceGuardrails";
import { buildDataRoomSuggestions, normalizeDataRoomKey } from "@/lib/ai/buildDataRoomSuggestions";
import { buildDecisionGraph } from "@/lib/ai/buildDecisionGraph";
import type { PrivateClientIntakeContext } from "@/lib/ai/intake-context";
import type { AiStrategyRoomOutput } from "@/lib/schemas/ai-strategy-room";
import {
  buildTimelineSummary,
  createDecisionVersion,
} from "@/lib/decision/createDecisionVersion";

export async function persistDecisionLayer(
  supabase: SupabaseClient,
  leadId: string,
  tenantId: string | null,
  ctx: PrivateClientIntakeContext,
  output: AiStrategyRoomOutput,
  meta: { source: string; changeSource?: string; changedBy?: string }
): Promise<void> {
  const decisionGraph = buildDecisionGraph(ctx, output);
  const dataRoomSuggestions = buildDataRoomSuggestions(ctx, output);
  const complianceGuardrails = buildComplianceGuardrails(output, decisionGraph);

  const { data: previousLead } = await supabase
    .from("leads")
    .select(
      "decision_stage, ai_decision_graph, ai_compliance_guardrails, ai_data_room_suggestions"
    )
    .eq("id", leadId)
    .maybeSingle();

  const decisionStage = decisionGraph.decisionStage;

  const timelineSummary = await buildTimelineSummary(
    supabase,
    leadId,
    decisionStage
  );

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      ai_decision_graph: decisionGraph,
      ai_compliance_guardrails: complianceGuardrails,
      ai_data_room_suggestions: dataRoomSuggestions,
      ai_decision_timeline_summary: timelineSummary,
      decision_stage: decisionStage,
    })
    .eq("id", leadId);

  if (updateError) {
    console.error("[decision-layer] lead update failed:", updateError.message);
    throw new Error(updateError.message);
  }

  await seedDataRoomItems(
    supabase,
    leadId,
    tenantId,
    dataRoomSuggestions.items
  ).catch((err) => {
    console.error("[decision-layer] data room seed failed:", err);
  });

  await createDecisionVersion(supabase, {
    tenantId,
    leadId,
    changeSource: meta.changeSource ?? "ai_generated",
    changedBy: meta.changedBy ?? meta.source,
    previousSnapshot: previousLead ?? null,
    newSnapshot: {
      decision_stage: decisionStage,
      ai_decision_graph: decisionGraph,
      ai_compliance_guardrails: complianceGuardrails,
    },
  }).catch((err) => {
    console.error("[decision-layer] version create failed:", err);
  });
}

async function seedDataRoomItems(
  supabase: SupabaseClient,
  leadId: string,
  tenantId: string | null,
  suggestions: ReturnType<typeof buildDataRoomSuggestions>["items"]
): Promise<void> {
  const { data: existing } = await supabase
    .from("decision_data_room_items")
    .select("category, item_name")
    .eq("lead_id", leadId);

  const existingKeys = new Set(
    (existing ?? []).map((row) =>
      normalizeDataRoomKey(row.category, row.item_name)
    )
  );

  const toInsert = suggestions
    .filter(
      (item) =>
        !existingKeys.has(normalizeDataRoomKey(item.category, item.itemName))
    )
    .map((item) => ({
      tenant_id: tenantId,
      lead_id: leadId,
      category: item.category,
      item_name: item.itemName,
      description: item.description,
      requested_from: item.requestedFrom,
      advisor_owner: item.advisorOwner,
      status: "not_requested" as const,
      priority: item.priority,
      visibility: item.visibility,
      ai_reason: item.aiReason,
    }));

  if (toInsert.length === 0) return;

  const { error } = await supabase
    .from("decision_data_room_items")
    .insert(toInsert);

  if (error) throw new Error(error.message);
}

export async function recordIntakeDecisionVersion(
  supabase: SupabaseClient,
  leadId: string,
  tenantId: string | null
): Promise<void> {
  await createDecisionVersion(supabase, {
    tenantId,
    leadId,
    changeSource: "intake_created",
    changedBy: "system",
    newSnapshot: { decision_stage: "exploration" },
  }).catch((err) => {
    console.error("[decision-layer] intake version failed:", err);
  });
}
