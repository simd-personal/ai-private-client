import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { advisorActionItemSchema } from "@/lib/schemas/advisor-action-board";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

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
      .from("advisor_action_items")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const items = (data ?? [])
      .map((row) => advisorActionItemSchema.safeParse(row))
      .filter((r) => r.success)
      .map((r) => r.data);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[advisor-action-items GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const createSchema = z.object({
  lane_role: z.string().min(1),
  title: z.string().min(1),
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
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("advisor_action_items")
      .insert({
        tenant_id: resolvedTenant.tenantId,
        lead_id: leadId,
        lane_role: body.lane_role,
        title: body.title,
        description: body.description ?? null,
        status: body.status ?? "open",
        priority: body.priority ?? "medium",
        owner_name: body.owner_name ?? null,
        owner_role: body.owner_role ?? body.lane_role,
        due_date: body.due_date ?? null,
        related_data_room_item_id: body.related_data_room_item_id ?? null,
        client_visible: body.client_visible ?? false,
        admin_notes: body.admin_notes ?? null,
        created_by: "admin",
        created_at: now,
        updated_at: now,
      })
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
    }

    const parsed = advisorActionItemSchema.safeParse(data);
    return NextResponse.json({ item: parsed.success ? parsed.data : data });
  } catch (error) {
    console.error("[advisor-action-items POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
