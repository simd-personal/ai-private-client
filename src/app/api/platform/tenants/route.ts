import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  TENANT_PLATFORM_SELECT_FIELDS,
  tenantCreateSchema,
} from "@/lib/platform-admin/tenant-schema";
import { getTenantStats } from "@/lib/platform-admin/tenant-stats";

export async function GET(request: Request) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenants")
      .select(TENANT_PLATFORM_SELECT_FIELDS)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[platform/tenants] list failed:", error);
      return NextResponse.json(
        { error: "Failed to fetch tenants" },
        { status: 500 }
      );
    }

    const tenants = await Promise.all(
      (data ?? []).map(async (tenant) => {
        const stats = await getTenantStats(tenant.id);
        return {
          ...tenant,
          lead_count: stats.leadCount,
          activity_count: stats.activityCount,
          last_lead_date: stats.lastLeadDate,
        };
      })
    );

    return NextResponse.json({ tenants });
  } catch (error) {
    console.error("[platform/tenants] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = tenantCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const payload = parsed.data;
    const { data, error } = await supabase
      .from("tenants")
      .insert({
        ...payload,
        supported_states: payload.supported_states.map((state) => state.trim()),
        service_areas: payload.service_areas.map((area) => area.trim()),
      })
      .select(TENANT_PLATFORM_SELECT_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Tenant slug already exists" },
          { status: 409 }
        );
      }
      console.error("[platform/tenants] create failed:", error);
      return NextResponse.json(
        { error: "Failed to create tenant" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tenant: data }, { status: 201 });
  } catch (error) {
    console.error("[platform/tenants] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
