import type { SupabaseClient } from "@supabase/supabase-js";

/** Columns always present before migration 017+. */
export const LEAD_PUBLIC_RESULT_SELECT_BASE =
  "id, lead_type, first_name, last_name, ai_report, created_at, quiz_data, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_relationship_map, ai_red_flags_missing_info, ai_decision_graph, ai_advisor_action_board";

export const LEAD_PUBLIC_RESULT_SELECT_EXTENDED = `${LEAD_PUBLIC_RESULT_SELECT_BASE}, generation_status, generation_progress, base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status, fast_public_brief, fast_public_brief_generated_at, public_result_ready_at`;

export const LEAD_STATUS_SELECT_BASE =
  "generation_status, generation_progress, base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status, ai_report, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_decision_graph, ai_advisor_action_board";

export const LEAD_STATUS_SELECT_EXTENDED = `${LEAD_STATUS_SELECT_BASE}, public_result_ready_at, fast_public_brief`;

/** Public result row; extended columns optional when migrations 018/019 are not applied. */
export type LeadPublicResultRow = {
  id: string;
  lead_type: string;
  first_name: string | null;
  last_name: string | null;
  ai_report: unknown;
  created_at: string;
  quiz_data: unknown;
  ai_strategy_room: unknown;
  ai_scenario_comparison: unknown;
  ai_advisor_coordination_map: unknown;
  ai_relationship_map: unknown;
  ai_red_flags_missing_info: unknown;
  ai_decision_graph: unknown;
  ai_advisor_action_board: unknown;
  generation_status?: string | null;
  generation_progress?: unknown;
  base_report_status?: string | null;
  strategy_room_status?: string | null;
  decision_layer_status?: string | null;
  advisor_action_board_status?: string | null;
  presentation_status?: string | null;
  fast_public_brief?: unknown;
  fast_public_brief_generated_at?: string | null;
  public_result_ready_at?: string | null;
};

export type LeadPublicStatusRow = Pick<
  LeadPublicResultRow,
  | "generation_status"
  | "generation_progress"
  | "base_report_status"
  | "strategy_room_status"
  | "decision_layer_status"
  | "advisor_action_board_status"
  | "presentation_status"
  | "ai_report"
  | "ai_strategy_room"
  | "ai_scenario_comparison"
  | "ai_advisor_coordination_map"
  | "ai_decision_graph"
  | "ai_advisor_action_board"
  | "public_result_ready_at"
  | "fast_public_brief"
>;

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("column") && lower.includes("does not exist");
}

export async function selectLeadForPublicResult(
  supabase: SupabaseClient,
  token: string
): Promise<{ data: LeadPublicResultRow | null; error: { message: string } | null }> {
  const extended = await supabase
    .from("leads")
    .select(LEAD_PUBLIC_RESULT_SELECT_EXTENDED)
    .eq("public_result_token", token)
    .single();

  if (!isMissingColumnError(extended.error?.message)) {
    return {
      data: extended.data as LeadPublicResultRow | null,
      error: extended.error,
    };
  }

  const fallback = await supabase
    .from("leads")
    .select(LEAD_PUBLIC_RESULT_SELECT_BASE)
    .eq("public_result_token", token)
    .single();

  return {
    data: fallback.data as LeadPublicResultRow | null,
    error: fallback.error,
  };
}

export async function selectLeadForPublicStatus(
  supabase: SupabaseClient,
  token: string
): Promise<{ data: LeadPublicStatusRow | null; error: { message: string } | null }> {
  const extended = await supabase
    .from("leads")
    .select(LEAD_STATUS_SELECT_EXTENDED)
    .eq("public_result_token", token)
    .single();

  if (!isMissingColumnError(extended.error?.message)) {
    return {
      data: extended.data as LeadPublicStatusRow | null,
      error: extended.error,
    };
  }

  const fallback = await supabase
    .from("leads")
    .select(LEAD_STATUS_SELECT_BASE)
    .eq("public_result_token", token)
    .single();

  return {
    data: fallback.data as LeadPublicStatusRow | null,
    error: fallback.error,
  };
}

export async function insertLeadRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<string> {
  const { data, error } = await supabase
    .from("leads")
    .insert(row)
    .select("id")
    .single();

  if (!error && data) return data.id as string;

  if (!isMissingColumnError(error?.message)) {
    throw new Error(error?.message ?? "Insert failed");
  }

  const {
    fast_public_brief: _a,
    fast_public_brief_generated_at: _b,
    public_result_ready_at: _c,
    generation_status: _d,
    generation_progress: _e,
    base_report_status: _f,
    strategy_room_status: _g,
    decision_layer_status: _h,
    advisor_action_board_status: _i,
    presentation_status: _j,
    ...fallbackRow
  } = row;

  void _a;
  void _b;
  void _c;
  void _d;
  void _e;
  void _f;
  void _g;
  void _h;
  void _i;
  void _j;

  const retry = await supabase
    .from("leads")
    .insert(fallbackRow)
    .select("id")
    .single();

  if (retry.error || !retry.data) {
    throw new Error(retry.error?.message ?? "Insert failed");
  }

  return retry.data.id as string;
}
