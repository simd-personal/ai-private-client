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
  params: Promise<{ leadId: string; commentId: string }>;
}

const updateCommentSchema = z
  .object({
    comment_text: z.string().trim().min(1).max(5000).optional(),
    comment_type: z.enum(LEAD_COMMENT_COMPOSER_TYPES).optional(),
  })
  .refine(
    (data) =>
      data.comment_text !== undefined || data.comment_type !== undefined,
    { message: "No fields to update" }
  );

export async function PATCH(request: Request, context: RouteContext) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, commentId } = await context.params;
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
    const parsed = updateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("lead_comments")
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .select(LEAD_COMMENT_SELECT_FIELDS)
      .maybeSingle();

    if (error) {
      console.error("[lead comments] update failed:", error);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ comment: data });
  } catch (error) {
    console.error("[lead comments] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, commentId } = await context.params;
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

    const { data, error } = await supabase
      .from("lead_comments")
      .delete()
      .eq("id", commentId)
      .eq("lead_id", leadId)
      .eq("tenant_id", tenantId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[lead comments] delete failed:", error);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[lead comments] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
