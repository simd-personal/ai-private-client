import { NextResponse } from "next/server";
import { z } from "zod";
import { LEAD_COMMENT_COMPOSER_TYPES } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";
import {
  LEAD_COMMENT_SELECT_FIELDS,
  fetchTenantScopedLead,
} from "@/lib/admin/lead-comments";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

interface RouteContext {
  params: Promise<{ leadId: string }>;
}

const createCommentSchema = z.object({
  comment_text: z.string().trim().min(1).max(5000),
  comment_type: z.enum(LEAD_COMMENT_COMPOSER_TYPES).default("note"),
  created_by: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z.string().trim().max(200).nullable().optional()
  ),
});

export async function GET(request: Request, context: RouteContext) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await context.params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const tenantId = resolvedTenant.tenantId;
    const supabase = getSupabaseAdmin();

    const lead = await fetchTenantScopedLead(supabase, leadId, tenantId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!tenantId) {
      return NextResponse.json({ comments: [] });
    }

    const { data, error } = await supabase
      .from("lead_comments")
      .select(LEAD_COMMENT_SELECT_FIELDS)
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[lead comments] list failed:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comments: data ?? [] });
  } catch (error) {
    console.error("[lead comments] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await context.params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const tenantId = resolvedTenant.tenantId;

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const lead = await fetchTenantScopedLead(supabase, leadId, tenantId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = createCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("lead_comments")
      .insert({
        tenant_id: tenantId,
        lead_id: leadId,
        comment_text: parsed.data.comment_text,
        comment_type: parsed.data.comment_type,
        created_by: parsed.data.created_by ?? null,
      })
      .select(LEAD_COMMENT_SELECT_FIELDS)
      .single();

    if (error) {
      console.error("[lead comments] create failed:", error);
      return NextResponse.json(
        { error: "Failed to add comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: data }, { status: 201 });
  } catch (error) {
    console.error("[lead comments] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
