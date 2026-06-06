import { NextResponse } from "next/server";
import { regenerateStrategyRoomForLead } from "@/lib/ai/persistStrategyRoom";
import type { LeadType } from "@/lib/ai/intake-context";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
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

    await regenerateStrategyRoomForLead(
      supabase,
      {
        id: String(lead.id),
        lead_type: lead.lead_type as LeadType,
        quiz_data: lead.quiz_data,
      },
      resolvedTenant.tenant
    );

    const { data: updated } = await supabase
      .from("leads")
      .select(
        "ai_generation_source, ai_generation_model, ai_generated_at, ai_deal_readiness"
      )
      .eq("id", leadId)
      .single();

    return NextResponse.json({
      success: true,
      source: updated?.ai_generation_source,
      model: updated?.ai_generation_model,
      generatedAt: updated?.ai_generated_at,
      readinessScore: (
        updated?.ai_deal_readiness as { readinessScore?: number } | null
      )?.readinessScore,
    });
  } catch (error) {
    console.error("[regenerate-ai] error:", error);
    return NextResponse.json(
      { error: "Failed to regenerate AI demo layer" },
      { status: 500 }
    );
  }
}
