import { NextResponse } from "next/server";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { presentationModeSchema } from "@/lib/schemas/ai-strategy-room";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
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

    const parsed = presentationModeSchema.safeParse(lead.ai_presentation_mode);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Presentation not available" },
        { status: 404 }
      );
    }

    return NextResponse.json({ presentation: parsed.data });
  } catch (error) {
    console.error("[presentation] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch presentation" },
      { status: 500 }
    );
  }
}
