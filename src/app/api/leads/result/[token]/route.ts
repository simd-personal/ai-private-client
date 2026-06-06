import { NextResponse } from "next/server";
import { logGenerationTiming } from "@/lib/ai/generation-timing";
import { toPublicReport } from "@/lib/schemas/ai-report";
import { toPublicStrategyRoomData } from "@/lib/schemas/ai-strategy-room";
import {
  toPublicDecisionLayerData,
  type DataRoomItem,
} from "@/lib/schemas/decision-layer";
import { parseFastPublicBrief } from "@/lib/schemas/fast-public-brief";
import { buildFastPublicBrief } from "@/lib/report/buildFastPublicBrief";
import { getDefaultTenant } from "@/lib/tenants/tenant-config";
import { toPublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { selectLeadForPublicResult } from "@/lib/leads/public-result-query";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const started = Date.now();
  try {
    const { token } = await params;

    if (!token || token.length < 16) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await selectLeadForPublicResult(supabase, token);

    if (error || !data) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const leadType = data.lead_type as
      | "buyer"
      | "seller"
      | "equity"
      | "wealth_forecast";

    const namesToRedact = [
      String(data.first_name ?? ""),
      String(data.last_name ?? ""),
      `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim(),
    ].filter(Boolean);

    const quizData = data.quiz_data as Record<string, unknown> | null;

    const generation = toPublicGenerationStatus(data);
    let fastBrief = parseFastPublicBrief(data.fast_public_brief);
    if (!fastBrief && data.ai_report == null && quizData?.contact) {
      const contact = quizData.contact as {
        firstName: string;
        lastName: string;
      };
      fastBrief = buildFastPublicBrief({
        leadType,
        quizData: quizData as Parameters<typeof buildFastPublicBrief>[0]["quizData"],
        tenant: getDefaultTenant(),
        firstName: contact.firstName,
        lastName: contact.lastName,
      });
    }
    const isFastBrief = data.ai_report == null && fastBrief != null;

    const report =
      data.ai_report != null
        ? toPublicReport(leadType, data.ai_report as Record<string, unknown>)
        : null;

    const strategyRoom =
      generation.publicSectionsReady.strategyRoom
        ? toPublicStrategyRoomData(data)
        : null;

    const { data: publicDataRoom } = await supabase
      .from("decision_data_room_items")
      .select("*")
      .eq("lead_id", data.id)
      .eq("visibility", "public");

    const decisionLayer =
      generation.publicSectionsReady.decisionGraph ||
      generation.publicSectionsReady.advisorReviewPlan
        ? toPublicDecisionLayerData(
            data,
            (publicDataRoom ?? []) as DataRoomItem[],
            { namesToRedact }
          )
        : toPublicDecisionLayerData(data, [], { namesToRedact });

    const sellerEstimatedValueRange =
      leadType === "seller" && quizData?.estimatedValueRange != null
        ? String(quizData.estimatedValueRange)
        : undefined;

    logGenerationTiming("public_result_response", {
      durationMs: Date.now() - started,
      mode: isFastBrief ? "fast" : report ? "full" : "pending",
    });

    return NextResponse.json({
      leadType,
      isFastBrief,
      publicResultReady: generation.publicResultReady,
      fastBrief: isFastBrief ? fastBrief : null,
      report,
      strategyRoom,
      decisionLayer,
      generation,
      sectionsReady: generation.publicSectionsReady,
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
