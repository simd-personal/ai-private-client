import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

const toNullIfBlank = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalTextField = (max: number) =>
  z.preprocess(toNullIfBlank, z.string().trim().max(max).nullable().optional());

const optionalEmailField = z.preprocess(
  toNullIfBlank,
  z.string().trim().email().max(320).nullable().optional()
);

const optionalUrlField = z.preprocess(
  toNullIfBlank,
  z.string().trim().url().max(500).nullable().optional()
);

const tenantUpdateSchema = z.object({
  brand_name: z.string().trim().min(1).max(200).optional(),
  agent_name: z.string().trim().min(1).max(200).optional(),
  agent_title: optionalTextField(200),
  brokerage_name: optionalTextField(200),
  agent_license_number: optionalTextField(200),
  brokerage_license_number: optionalTextField(200),
  notification_email: optionalEmailField,
  contact_email: optionalEmailField,
  phone: optionalTextField(64),
  booking_url: optionalUrlField,
  logo_url: optionalUrlField,
  primary_color: optionalTextField(32),
  accent_color: optionalTextField(32),
  supported_states: z.array(z.string().trim().min(1).max(32)).optional(),
  service_areas: z.array(z.string().trim().min(1).max(120)).optional(),
  default_state: z.string().trim().min(1).max(32).optional(),
  disclaimer_text: optionalTextField(2000),
  seo_base_title: optionalTextField(200),
  seo_base_description: optionalTextField(500),
});

const SELECT_FIELDS = `
  id,
  slug,
  brand_name,
  agent_name,
  agent_title,
  brokerage_name,
  agent_license_number,
  brokerage_license_number,
  notification_email,
  contact_email,
  phone,
  booking_url,
  logo_url,
  primary_color,
  accent_color,
  supported_states,
  service_areas,
  default_state,
  disclaimer_text,
  seo_base_title,
  seo_base_description
`;

export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    if (!resolvedTenant.tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("tenants")
      .select(SELECT_FIELDS)
      .eq("id", resolvedTenant.tenantId)
      .single();

    if (error || !data) {
      console.error("[admin/tenant] fetch failed:", error);
      return NextResponse.json(
        { error: "Failed to load tenant settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenant: data,
      tenantBrandName: resolvedTenant.tenant.brandName,
    });
  } catch (error) {
    console.error("[admin/tenant] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    if (!resolvedTenant.tenantId) {
      return NextResponse.json(
        { error: "Tenant not found" },
        { status: 404 }
      );
    }

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
    const { data, error } = await supabase
      .from("tenants")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", resolvedTenant.tenantId)
      .select(SELECT_FIELDS)
      .single();

    if (error || !data) {
      console.error("[admin/tenant] update failed:", error);
      return NextResponse.json(
        { error: "Failed to update tenant settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      tenant: data,
      tenantBrandName: data.brand_name,
    });
  } catch (error) {
    console.error("[admin/tenant] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
