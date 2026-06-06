import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { createDecisionVersion } from "@/lib/decision/createDecisionVersion";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const patchSchema = z.object({
  category: z.string().optional(),
  item_name: z.string().optional(),
  description: z.string().nullable().optional(),
  requested_from: z.string().nullable().optional(),
  advisor_owner: z.string().nullable().optional(),
  status: z
    .enum(["not_requested", "requested", "received", "reviewed", "not_needed"])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  visibility: z.enum(["public", "admin"]).optional(),
  due_date: z.string().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string; itemId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, itemId } = await params;
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

    const body = patchSchema.parse(await request.json());
    const { data, error } = await supabase
      .from("decision_data_room_items")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await createDecisionVersion(supabase, {
      tenantId: resolvedTenant.tenantId,
      leadId,
      changeSource: "data_room_update",
      newSnapshot: { item: data.item_name, status: data.status },
    }).catch(() => undefined);

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("[data-room PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leadId: string; itemId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, itemId } = await params;
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

    const { error } = await supabase
      .from("decision_data_room_items")
      .delete()
      .eq("id", itemId)
      .eq("lead_id", leadId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[data-room DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
