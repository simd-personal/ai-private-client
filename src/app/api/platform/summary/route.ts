import { NextResponse } from "next/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import { getTenantStats } from "@/lib/platform-admin/tenant-stats";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface TenantRow {
  id: string;
  slug: string;
  brand_name: string;
  agent_name: string;
  created_at: string;
}

export async function GET(request: Request) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: tenantsData, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, slug, brand_name, agent_name, created_at")
      .order("created_at", { ascending: false });

    if (tenantsError) {
      console.error("[platform/summary] tenants query failed:", tenantsError);
      return NextResponse.json(
        { error: "Failed to fetch platform summary" },
        { status: 500 }
      );
    }

    const tenants = (tenantsData ?? []) as TenantRow[];
    const tenantStats = await Promise.all(
      tenants.map(async (tenant) => ({
        ...tenant,
        ...(await getTenantStats(tenant.id)),
      }))
    );

    const totalTenants = tenantStats.length;
    const totalLeads = tenantStats.reduce((sum, item) => sum + item.leadCount, 0);
    const totalActivityEvents = tenantStats.reduce(
      (sum, item) => sum + item.activityCount,
      0
    );

    const topTenantsByLeadCount = [...tenantStats]
      .sort((a, b) => b.leadCount - a.leadCount)
      .slice(0, 5)
      .map((tenant) => ({
        slug: tenant.slug,
        brand_name: tenant.brand_name,
        agent_name: tenant.agent_name,
        lead_count: tenant.leadCount,
      }));

    const recentTenants = tenantStats.slice(0, 8).map((tenant) => ({
      slug: tenant.slug,
      brand_name: tenant.brand_name,
      agent_name: tenant.agent_name,
      created_at: tenant.created_at,
      lead_count: tenant.leadCount,
    }));

    const { data: latestLeadRow, error: latestLeadError } = await supabase
      .from("leads")
      .select("created_at, tenant_id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLeadError) {
      console.error("[platform/summary] latest lead query failed:", latestLeadError);
      return NextResponse.json(
        { error: "Failed to fetch platform summary" },
        { status: 500 }
      );
    }

    const latestLeadCreated = latestLeadRow?.created_at ?? null;
    const latestTenantCreated = tenantStats[0]?.created_at ?? null;

    return NextResponse.json({
      totalTenants,
      totalLeads,
      totalActivityEvents,
      latestTenantCreated,
      latestLeadCreated,
      topTenantsByLeadCount,
      recentTenants,
    });
  } catch (error) {
    console.error("[platform/summary] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
