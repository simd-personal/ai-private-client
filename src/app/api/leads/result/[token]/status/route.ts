import { NextResponse } from "next/server";
import { maybeRecoverStaleLeadGeneration } from "@/lib/ai/generation-recovery";
import { scheduleLeadGenerationPipeline } from "@/lib/ai/runLeadGenerationPipeline";
import { toPublicGenerationStatus } from "@/lib/schemas/lead-generation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { selectLeadForPublicStatus } from "@/lib/leads/public-result-query";
import { resolveTenantById } from "@/lib/tenants/tenant-resolver";

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
    const { data, error } = await selectLeadForPublicStatus(supabase, token);

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (data.id) {
      await maybeRecoverStaleLeadGeneration(supabase, data, async ({ leadId, tenantId, phase }) => {
        const { tenantId: resolvedTenantId, tenant } =
          await resolveTenantById(tenantId);
        scheduleLeadGenerationPipeline({
          leadId,
          tenantId: resolvedTenantId,
          tenant,
          phase,
        });
      });
    }

    return NextResponse.json(toPublicGenerationStatus(data));
  } catch (error) {
    console.error("[result status GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
