import { NextResponse } from "next/server";
import {
  getAdminAnalyticsSummary,
  getLeadSessionJourneys,
  getRecentSiteEvents,
} from "@/lib/analytics/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    const { searchParams } = new URL(request.url);
    const leadIdsParam = searchParams.get("leadIds");

    const [summary, recentEvents] = await Promise.all([
      getAdminAnalyticsSummary(resolvedTenant.tenantId),
      getRecentSiteEvents(500, resolvedTenant.tenantId),
    ]);

    let leadJourneys: Record<string, Awaited<
      ReturnType<typeof getLeadSessionJourneys>
    >[string]> = {};

    if (leadIdsParam) {
      const leadIds = leadIdsParam.split(",").filter(Boolean).slice(0, 50);
      leadJourneys = await getLeadSessionJourneys(
        leadIds,
        resolvedTenant.tenantId
      );
    } else {
      const supabase = getSupabaseAdmin();
      const leadsQuery = supabase
        .from("leads")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(25);

      if (resolvedTenant.tenantId) {
        leadsQuery.eq("tenant_id", resolvedTenant.tenantId);
      } else {
        leadsQuery.is("tenant_id", null);
      }

      const { data: leads } = await leadsQuery;

      const leadIds = (leads ?? []).map((lead) => lead.id);
      leadJourneys = await getLeadSessionJourneys(
        leadIds,
        resolvedTenant.tenantId
      );
    }

    const leadTypes = new Map<string, string>();
    if (Object.keys(leadJourneys).length > 0) {
      const supabase = getSupabaseAdmin();
      const leadsQuery = supabase
        .from("leads")
        .select("id, lead_type")
        .in("id", Object.keys(leadJourneys));

      if (resolvedTenant.tenantId) {
        leadsQuery.eq("tenant_id", resolvedTenant.tenantId);
      } else {
        leadsQuery.is("tenant_id", null);
      }

      const { data: leads } = await leadsQuery;

      for (const lead of leads ?? []) {
        leadTypes.set(lead.id, lead.lead_type);
      }
    }

    const recentActivity = recentEvents.map((event) => ({
      id: event.id,
      createdAt: event.created_at,
      eventName: event.event_name,
      pagePath: event.page_path,
      sessionId: event.session_id,
      leadId: event.lead_id,
      leadType: event.lead_id ? (leadTypes.get(event.lead_id) ?? null) : null,
      metadata: event.metadata,
    }));

    return NextResponse.json({
      summary,
      recentActivity,
      leadJourneys,
      tenantBrandName: resolvedTenant.tenant.brandName,
    });
  } catch (error) {
    console.error("[admin/analytics] error:", error);
    return NextResponse.json(
      { error: "Failed to load analytics" },
      { status: 500 }
    );
  }
}
