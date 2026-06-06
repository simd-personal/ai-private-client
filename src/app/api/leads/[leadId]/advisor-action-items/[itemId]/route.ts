import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { advisorActionItemSchema } from "@/lib/schemas/advisor-action-board";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const patchSchema = z.object({
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  status: z
    .enum([
      "open",
      "in_progress",
      "waiting_on_client",
      "waiting_on_advisor",
      "complete",
      "not_needed",
    ])
    .optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  owner_name: z.string().nullable().optional(),
  owner_role: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  related_data_room_item_id: z.string().uuid().nullable().optional(),
  client_visible: z.boolean().optional(),
  admin_notes: z.string().nullable().optional(),
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
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { ...body, updated_at: now };

    if (body.status === "complete") {
      updates.completed_at = now;
    }

    const { data, error } = await supabase
      .from("advisor_action_items")
      .update(updates)
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const parsed = advisorActionItemSchema.safeParse(data);
    return NextResponse.json({ item: parsed.success ? parsed.data : data });
  } catch (error) {
    console.error("[advisor-action-items PATCH]", error);
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
      .from("advisor_action_items")
      .delete()
      .eq("id", itemId)
      .eq("lead_id", leadId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[advisor-action-items DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
