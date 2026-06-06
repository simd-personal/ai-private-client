import { NextResponse } from "next/server";
import { buildComplianceGuardrails } from "@/lib/ai/buildComplianceGuardrails";
import { buildDecisionGraph } from "@/lib/ai/buildDecisionGraph";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { buildIntakeContext } from "@/lib/ai/intake-context";
import type { LeadType } from "@/lib/ai/intake-context";
import {
  advisorCoordinationMapSchema,
  dealReadinessSchema,
  meetingPrepPackSchema,
  redFlagsAndMissingInfoSchema,
  strategyRoomSchema,
} from "@/lib/schemas/ai-strategy-room";
import {
  decisionGraphSchema,
  parseDecisionField,
} from "@/lib/schemas/decision-layer";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

async function loadGuardrails(supabase: ReturnType<typeof getSupabaseAdmin>, leadId: string) {
  const { data } = await supabase
    .from("leads")
    .select(
      "ai_compliance_guardrails, ai_decision_graph, ai_strategy_room, ai_advisor_coordination_map, ai_deal_readiness, ai_red_flags_missing_info, ai_meeting_prep_pack, lead_type, quiz_data"
    )
    .eq("id", leadId)
    .single();
  return data;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const supabase = getSupabaseAdmin();
    const lead = await fetchTenantScopedLead(
      supabase,
      leadId,
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const data = await loadGuardrails(supabase, leadId);
    const stored = data?.ai_compliance_guardrails;
    if (stored) {
      return NextResponse.json({ guardrails: stored });
    }

    return NextResponse.json({ guardrails: null });
  } catch (error) {
    console.error("[compliance GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const supabase = getSupabaseAdmin();
    const lead = await fetchTenantScopedLead(
      supabase,
      leadId,
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const data = await loadGuardrails(supabase, leadId);
    if (!data) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const strategyRoom = strategyRoomSchema.parse(data.ai_strategy_room);
    const output = {
      strategyRoom,
      advisorCoordinationMap: advisorCoordinationMapSchema.parse(
        data.ai_advisor_coordination_map
      ),
      dealReadiness: dealReadinessSchema.parse(data.ai_deal_readiness),
      redFlagsAndMissingInfo: redFlagsAndMissingInfoSchema.parse(
        data.ai_red_flags_missing_info
      ),
      meetingPrepPack: meetingPrepPackSchema.parse(data.ai_meeting_prep_pack),
    };

    let graph = parseDecisionField(decisionGraphSchema, data.ai_decision_graph);
    if (!graph) {
      const ctx = buildIntakeContext(
        data.lead_type as LeadType,
        data.quiz_data as never
      );
      graph = buildDecisionGraph(ctx, output as never);
    }

    const guardrails = buildComplianceGuardrails(output as never, graph);

    await supabase
      .from("leads")
      .update({ ai_compliance_guardrails: guardrails })
      .eq("id", leadId);

    return NextResponse.json({ guardrails });
  } catch (error) {
    console.error("[compliance recheck]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
