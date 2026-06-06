import { NextResponse } from "next/server";
import { toPublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .select(
        "generation_status, generation_progress, base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status, ai_report, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_decision_graph, ai_advisor_action_board"
      )
      .eq("public_result_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(toPublicGenerationStatus(data));
  } catch (error) {
    console.error("[result status GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
