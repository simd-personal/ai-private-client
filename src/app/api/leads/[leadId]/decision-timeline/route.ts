import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
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
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("decision_versions")
      .select("*")
      .eq("lead_id", leadId)
      .order("version_number", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ versions: data ?? [] });
  } catch (error) {
    console.error("[timeline GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
