import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  TENANT_PLATFORM_SELECT_FIELDS,
  tenantUpdateSchema,
} from "@/lib/platform-admin/tenant-schema";
import { getTenantStats } from "@/lib/platform-admin/tenant-stats";

interface RouteContext {
  params: Promise<{ tenantSlug: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenants")
      .select(TENANT_PLATFORM_SELECT_FIELDS)
      .eq("slug", tenantSlug)
      .maybeSingle();

    if (error) {
      console.error("[platform/tenants/:slug] get failed:", error);
      return NextResponse.json(
        { error: "Failed to fetch tenant" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const stats = await getTenantStats(data.id);
    return NextResponse.json({
      tenant: data,
      lead_count: stats.leadCount,
      activity_count: stats.activityCount,
      last_lead_date: stats.lastLeadDate,
    });
  } catch (error) {
    console.error("[platform/tenants/:slug] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug } = await context.params;
    const body = await request.json();
    const parsed = tenantUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const payload = {
      ...updates,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("tenants")
      .update(payload)
      .eq("slug", tenantSlug)
      .select(TENANT_PLATFORM_SELECT_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("[platform/tenants/:slug] update failed:", error);
      return NextResponse.json(
        { error: "Failed to update tenant" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const stats = await getTenantStats(data.id);
    return NextResponse.json({
      tenant: data,
      lead_count: stats.leadCount,
      activity_count: stats.activityCount,
      last_lead_date: stats.lastLeadDate,
    });
  } catch (error) {
    console.error("[platform/tenants/:slug] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
