import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface TenantStats {
  leadCount: number;
  activityCount: number;
  lastLeadDate: string | null;
}

export async function getTenantStats(tenantId: string): Promise<TenantStats> {
  const supabase = getSupabaseAdmin();

  const [leadCountResult, activityCountResult, lastLeadResult] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId),
    supabase
      .from("site_events")
      .select("id", { head: true, count: "exact" })
      .eq("tenant_id", tenantId),
    supabase
      .from("leads")
      .select("created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (leadCountResult.error) {
    throw leadCountResult.error;
  }
  if (activityCountResult.error) {
    throw activityCountResult.error;
  }
  if (lastLeadResult.error) {
    throw lastLeadResult.error;
  }

  return {
    leadCount: leadCountResult.count ?? 0,
    activityCount: activityCountResult.count ?? 0,
    lastLeadDate: lastLeadResult.data?.created_at ?? null,
  };
}
