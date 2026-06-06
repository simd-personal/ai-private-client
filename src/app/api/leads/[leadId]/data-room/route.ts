import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { createDecisionVersion } from "@/lib/decision/createDecisionVersion";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const createSchema = z.object({
  category: z.string().min(1),
  item_name: z.string().min(1),
  description: z.string().optional(),
  requested_from: z.string().optional(),
  advisor_owner: z.string().optional(),
  status: z
    .enum(["not_requested", "requested", "received", "reviewed", "not_needed"])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  visibility: z.enum(["public", "admin"]).optional(),
  ai_reason: z.string().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const supabase = getSupabaseAdmin();
    const lead = await fetchTenantScopedLead(
      supabase,
      leadId,
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("decision_data_room_items")
      .select("*")
      .eq("lead_id", leadId)
      .order("category")
      .order("created_at");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (error) {
    console.error("[data-room GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId } = await params;
    const resolvedTenant = await resolveTenantFromRequest(request);
    const supabase = getSupabaseAdmin();
    const lead = await fetchTenantScopedLead(
      supabase,
      leadId,
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const body = createSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("decision_data_room_items")
      .insert({
        tenant_id: resolvedTenant.tenantId,
        lead_id: leadId,
        category: body.category,
        item_name: body.item_name,
        description: body.description ?? null,
        requested_from: body.requested_from ?? null,
        advisor_owner: body.advisor_owner ?? null,
        status: body.status ?? "not_requested",
        priority: body.priority ?? "medium",
        visibility: body.visibility ?? "admin",
        ai_reason: body.ai_reason ?? null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createDecisionVersion(supabase, {
      tenantId: resolvedTenant.tenantId,
      leadId,
      changeSource: "data_room_update",
      newSnapshot: { item: data.item_name, status: data.status },
    }).catch(() => undefined);

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("[data-room POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
