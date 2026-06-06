import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { regenerateAdvisorActionBoardForLead } from "@/lib/ai/persistAdvisorActionBoard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

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

    const board = await regenerateAdvisorActionBoardForLead(supabase, leadId, {
      tenantId: resolvedTenant.tenantId,
    });

    if (!board) {
      return NextResponse.json(
        { error: "Strategy room required before generating action board" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      board,
      generatedAt: board.generatedAt,
      source: board.source,
      model: board.model,
      laneCount: board.lanes.length,
      blockerCount: board.blockers.length,
      nextBestPathCount: board.nextBestPath.length,
    });
  } catch (error) {
    console.error("[advisor-action-board regenerate]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
