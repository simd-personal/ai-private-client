import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  TENANT_DOMAIN_SELECT_FIELDS,
  domainCreateSchema,
} from "@/lib/platform-admin/domain-schema";

interface RouteContext {
  params: Promise<{ tenantSlug: string }>;
}

async function resolveTenantId(tenantSlug: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("id")
    .eq("slug", tenantSlug)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

export async function GET(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug } = await context.params;
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenant_domains")
      .select(TENANT_DOMAIN_SELECT_FIELDS)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[platform/domains] list failed:", error);
      return NextResponse.json(
        { error: "Failed to fetch domains" },
        { status: 500 }
      );
    }

    return NextResponse.json({ domains: data ?? [] });
  } catch (error) {
    console.error("[platform/domains] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug } = await context.params;
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = domainCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenant_domains")
      .insert({
        tenant_id: tenantId,
        domain: parsed.data.domain,
        domain_type: parsed.data.domain_type,
        status: "pending",
      })
      .select(TENANT_DOMAIN_SELECT_FIELDS)
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Domain already exists" },
          { status: 409 }
        );
      }
      console.error("[platform/domains] create failed:", error);
      return NextResponse.json(
        { error: "Failed to add domain" },
        { status: 500 }
      );
    }

    return NextResponse.json({ domain: data }, { status: 201 });
  } catch (error) {
    console.error("[platform/domains] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
