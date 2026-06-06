import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildAdvisorActionBoard,
  type BuildAdvisorActionBoardInput,
} from "@/lib/ai/buildAdvisorActionBoard";
import { buildIntakeContext, type LeadType } from "@/lib/ai/intake-context";
import { buildDecisionGraph } from "@/lib/ai/buildDecisionGraph";
import { aiStrategyRoomOutputSchema } from "@/lib/schemas/ai-strategy-room";
import type { AdvisorActionBoard } from "@/lib/schemas/advisor-action-board";
import {
  dataRoomItemSchema,
  decisionGraphSchema,
  meetingNoteSchema,
} from "@/lib/schemas/decision-layer";
import type {
  BuyerQuizData,
  EquityQuizData,
  SellerQuizData,
  WealthQuizData,
} from "@/lib/schemas/quiz";
import { createDecisionVersion } from "@/lib/decision/createDecisionVersion";
import { MERCER_DEMO_SCENARIO } from "@/lib/demo/mercer-demo-tenant";

export async function markAdvisorActionBoardStale(
  supabase: SupabaseClient,
  leadId: string,
  reason: string
): Promise<void> {
  const { data: lead } = await supabase
    .from("leads")
    .select("ai_advisor_action_board")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead?.ai_advisor_action_board) return;

  const board = lead.ai_advisor_action_board as Record<string, unknown>;
  await supabase
    .from("leads")
    .update({
      ai_advisor_action_board: {
        ...board,
        stale: true,
        staleReason: reason,
      },
      ai_advisor_action_board_stale: true,
    })
    .eq("id", leadId);
}

async function loadBoardInput(
  supabase: SupabaseClient,
  leadId: string
): Promise<BuildAdvisorActionBoardInput | null> {
  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "lead_type, quiz_data, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_advisor_specific_briefs, ai_deal_readiness, ai_relationship_map, ai_meeting_prep_pack, ai_white_glove_follow_up, ai_red_flags_missing_info, ai_presentation_mode, ai_decision_graph"
    )
    .eq("id", leadId)
    .single();

  if (error || !lead?.ai_strategy_room) return null;

  const outputParsed = aiStrategyRoomOutputSchema.safeParse({
    strategyRoom: lead.ai_strategy_room,
    scenarioComparison: lead.ai_scenario_comparison,
    advisorCoordinationMap: lead.ai_advisor_coordination_map,
    advisorSpecificBriefs: lead.ai_advisor_specific_briefs,
    dealReadiness: lead.ai_deal_readiness,
    relationshipIntelligenceMap: lead.ai_relationship_map,
    meetingPrepPack: lead.ai_meeting_prep_pack,
    whiteGloveFollowUp: lead.ai_white_glove_follow_up,
    redFlagsAndMissingInfo: lead.ai_red_flags_missing_info,
    presentationMode: lead.ai_presentation_mode,
  });

  if (!outputParsed.success) return null;

  const quizData = lead.quiz_data as
    | BuyerQuizData
    | SellerQuizData
    | EquityQuizData
    | WealthQuizData;
  const ctx = buildIntakeContext(lead.lead_type as LeadType, quizData);

  const decisionGraph =
    decisionGraphSchema.safeParse(lead.ai_decision_graph).success &&
    lead.ai_decision_graph
      ? decisionGraphSchema.parse(lead.ai_decision_graph)
      : buildDecisionGraph(ctx, outputParsed.data);

  const { data: dataRoomRows } = await supabase
    .from("decision_data_room_items")
    .select("*")
    .eq("lead_id", leadId);

  const dataRoomItems = (dataRoomRows ?? [])
    .map((row) => dataRoomItemSchema.safeParse(row))
    .filter((r) => r.success)
    .map((r) => r.data);

  const { data: meetingRows } = await supabase
    .from("lead_meeting_notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(5);

  const meetingNotes = (meetingRows ?? [])
    .map((row) => meetingNoteSchema.safeParse(row))
    .filter((r) => r.success)
    .map((r) => r.data);

  const quizRecord = quizData as { demoScenario?: string };
  const isMercerDemo = quizRecord.demoScenario === MERCER_DEMO_SCENARIO;

  return {
    ctx,
    output: outputParsed.data,
    decisionGraph,
    dataRoomItems,
    meetingNotes,
    isMercerDemo,
  };
}

export async function generateAndPersistAdvisorActionBoard(
  supabase: SupabaseClient,
  leadId: string,
  options?: {
    tenantId?: string | null;
    changeSource?: string;
    seedActionItems?: boolean;
  }
): Promise<AdvisorActionBoard | null> {
  const input = await loadBoardInput(supabase, leadId);
  if (!input) return null;

  const board = buildAdvisorActionBoard(input);
  const now = board.generatedAt;

  const { data: previousLead } = await supabase
    .from("leads")
    .select("ai_advisor_action_board")
    .eq("id", leadId)
    .maybeSingle();

  const { error } = await supabase
    .from("leads")
    .update({
      ai_advisor_action_board: board,
      ai_advisor_action_board_generated_at: now,
      ai_advisor_action_board_source: board.source,
      ai_advisor_action_board_model: board.model,
      ai_advisor_action_board_stale: false,
    })
    .eq("id", leadId);

  if (error) {
    console.error("[advisor-action-board] persist failed:", error.message);
    throw new Error(error.message);
  }

  await createDecisionVersion(supabase, {
    tenantId: options?.tenantId ?? null,
    leadId,
    changeSource: options?.changeSource ?? "advisor_action_board_generated",
    changedBy: "system",
    previousSnapshot: previousLead ?? null,
    newSnapshot: {
      ai_advisor_action_board: board,
      laneCount: board.lanes.length,
      blockerCount: board.blockers.length,
    },
  }).catch((err) => {
    console.error("[advisor-action-board] version create failed:", err);
  });

  if (options?.seedActionItems) {
    await createAdvisorActionItemsFromBoard(
      supabase,
      leadId,
      board,
      options.tenantId ?? null
    ).catch((err) => {
      console.error("[advisor-action-board] seed items failed:", err);
    });
  }

  return board;
}

export async function regenerateAdvisorActionBoardForLead(
  supabase: SupabaseClient,
  leadId: string,
  options?: { tenantId?: string | null }
): Promise<AdvisorActionBoard | null> {
  return generateAndPersistAdvisorActionBoard(supabase, leadId, {
    tenantId: options?.tenantId ?? null,
    changeSource: "advisor_action_board_regenerated",
  });
}

export async function createAdvisorActionItemsFromBoard(
  supabase: SupabaseClient,
  leadId: string,
  board: AdvisorActionBoard,
  tenantId: string | null,
  options?: { replaceExisting?: boolean }
): Promise<number> {
  if (options?.replaceExisting) {
    await supabase.from("advisor_action_items").delete().eq("lead_id", leadId);
  }

  const { count } = await supabase
    .from("advisor_action_items")
    .select("*", { count: "exact", head: true })
    .eq("lead_id", leadId);

  if ((count ?? 0) > 0 && !options?.replaceExisting) {
    return 0;
  }

  const now = new Date().toISOString();
  const rows = board.lanes.slice(0, 5).map((lane, index) => {
    const relatedItem = lane.relatedDataRoomItems.find((item) => item.itemId);
    return {
      tenant_id: tenantId,
      lead_id: leadId,
      lane_role: lane.advisorRole,
      title: lane.nextAction.slice(0, 120),
      description: lane.laneSummary,
      status: lane.status === "complete" ? "complete" : "open",
      priority: lane.urgency,
      owner_name: lane.suggestedOwnerName ?? null,
      owner_role: lane.advisorRole,
      related_data_room_item_id: relatedItem?.itemId ?? null,
      client_visible: lane.canShareWithClient && index < 2,
      admin_notes: lane.adminOnlyNote,
      created_by: "system",
      created_at: now,
      updated_at: now,
    };
  });

  board.nextBestPath.slice(0, 2).forEach((step) => {
    rows.push({
      tenant_id: tenantId,
      lead_id: leadId,
      lane_role: step.ownerRole,
      title: step.title.slice(0, 120),
      description: step.reason,
      status: "open",
      priority: "medium",
      owner_name: null,
      owner_role: step.ownerRole,
      related_data_room_item_id: null,
      client_visible: true,
      admin_notes: step.adminOnlyNote,
      created_by: "system",
      created_at: now,
      updated_at: now,
    });
  });

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("advisor_action_items").insert(rows);
  if (error) throw new Error(error.message);
  return rows.length;
}
