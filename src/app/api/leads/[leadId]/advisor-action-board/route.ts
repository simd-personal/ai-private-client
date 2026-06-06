import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import {
  parseAdvisorActionBoard,
  toAdminAdvisorActionBoard,
} from "@/lib/schemas/advisor-action-board";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

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
      resolvedTenant.tenantId,
      "id, ai_advisor_action_board, ai_advisor_action_board_generated_at, ai_advisor_action_board_source, ai_advisor_action_board_model, ai_advisor_action_board_stale"
    );

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const board = toAdminAdvisorActionBoard(
      parseAdvisorActionBoard(lead.ai_advisor_action_board)
    );

    return NextResponse.json({
      board,
      generatedAt: lead.ai_advisor_action_board_generated_at ?? null,
      source: lead.ai_advisor_action_board_source ?? null,
      model: lead.ai_advisor_action_board_model ?? null,
      stale: Boolean(lead.ai_advisor_action_board_stale),
    });
  } catch (error) {
    console.error("[advisor-action-board GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
