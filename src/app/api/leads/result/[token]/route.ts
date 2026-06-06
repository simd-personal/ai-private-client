import { NextResponse } from "next/server";
import { toPublicReport } from "@/lib/schemas/ai-report";
import { toPublicStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import {
  toPublicDecisionLayerData,
  type DataRoomItem,
} from "@/lib/schemas/decision-layer";
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
        "id, lead_type, ai_report, created_at, quiz_data, ai_strategy_room, ai_scenario_comparison, ai_advisor_coordination_map, ai_relationship_map, ai_red_flags_missing_info, ai_decision_graph, ai_advisor_action_board, generation_status, generation_progress, base_report_status, strategy_room_status, decision_layer_status, advisor_action_board_status, presentation_status"
      )
      .eq("public_result_token", token)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const leadType = data.lead_type as
      | "buyer"
      | "seller"
      | "equity"
      | "wealth_forecast";
    const generation = toPublicGenerationStatus(data);

    const report =
      data.ai_report != null
        ? toPublicReport(
            leadType,
            data.ai_report as Record<string, unknown>
          )
        : null;

    const strategyRoom = toPublicStrategyRoomData(data);

    const { data: publicDataRoom } = await supabase
      .from("decision_data_room_items")
      .select("*")
      .eq("lead_id", data.id)
      .eq("visibility", "public");

    const decisionLayer = toPublicDecisionLayerData(
      data,
      (publicDataRoom ?? []) as DataRoomItem[]
    );

    const quizData = data.quiz_data as Record<string, unknown> | null;
    const sellerEstimatedValueRange =
      leadType === "seller" && quizData?.estimatedValueRange != null
        ? String(quizData.estimatedValueRange)
        : undefined;

    return NextResponse.json({
      leadType,
      report,
      strategyRoom,
      decisionLayer,
      generation,
      createdAt: data.created_at,
      sellerEstimatedValueRange,
    });
  } catch (error) {
    console.error("Result token API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
