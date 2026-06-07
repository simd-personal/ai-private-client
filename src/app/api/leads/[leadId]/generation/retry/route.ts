import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { scheduleLeadGenerationPipeline, runLeadGenerationPipeline } from "@/lib/ai/runLeadGenerationPipeline";
import {
  initialGenerationColumns,
  isAsyncLeadGenerationEnabled,
} from "@/lib/schemas/lead-generation";
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

    await supabase
      .from("leads")
      .update({
        ...initialGenerationColumns(),
        generation_error: null,
        generation_started_at: null,
        generation_completed_at: null,
      })
      .eq("id", leadId);

    if (isAsyncLeadGenerationEnabled()) {
      scheduleLeadGenerationPipeline({
        leadId,
        tenantId: resolvedTenant.tenantId,
        tenant: resolvedTenant.tenant,
        mode: "background",
      });
    } else {
      await runLeadGenerationPipeline({
        leadId,
        tenantId: resolvedTenant.tenantId,
        tenant: resolvedTenant.tenant,
        mode: "sync",
        phase: "full",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[generation retry]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
