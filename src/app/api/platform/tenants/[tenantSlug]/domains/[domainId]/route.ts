import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyPlatformAdmin } from "@/lib/platform-admin/auth";
import {
  TENANT_DOMAIN_SELECT_FIELDS,
  domainUpdateSchema,
} from "@/lib/platform-admin/domain-schema";

interface RouteContext {
  params: Promise<{ tenantSlug: string; domainId: string }>;
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

export async function PATCH(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug, domainId } = await context.params;
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = domainUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    };
    if (parsed.data.status === "active" || parsed.data.status === "verified") {
      updates.verified_at = new Date().toISOString();
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenant_domains")
      .update(updates)
      .eq("id", domainId)
      .eq("tenant_id", tenantId)
      .select(TENANT_DOMAIN_SELECT_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("[platform/domains] update failed:", error);
      return NextResponse.json(
        { error: "Failed to update domain" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ domain: data });
  } catch (error) {
    console.error("[platform/domains] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyPlatformAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tenantSlug, domainId } = await context.params;
    const tenantId = await resolveTenantId(tenantSlug);
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenant_domains")
      .delete()
      .eq("id", domainId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[platform/domains] delete failed:", error);
      return NextResponse.json(
        { error: "Failed to delete domain" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[platform/domains] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
