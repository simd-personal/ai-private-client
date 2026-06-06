import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { generateMeetingSummary } from "@/lib/ai/generateMeetingSummary";
import { createDecisionVersion } from "@/lib/decision/createDecisionVersion";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const createSchema = z.object({
  note_title: z.string().optional(),
  note_body: z.string().min(1),
  meeting_date: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  generate_summary: z.boolean().optional(),
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
      .from("lead_meeting_notes")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notes: data ?? [] });
  } catch (error) {
    console.error("[meeting-notes GET]", error);
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
    const aiSummary =
      body.generate_summary !== false
        ? generateMeetingSummary(body.note_body)
        : null;

    const { data, error } = await supabase
      .from("lead_meeting_notes")
      .insert({
        tenant_id: resolvedTenant.tenantId,
        lead_id: leadId,
        note_title: body.note_title ?? null,
        note_body: body.note_body,
        meeting_date: body.meeting_date ?? null,
        attendees: body.attendees ?? [],
        ai_summary: aiSummary,
        created_by: "admin",
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await createDecisionVersion(supabase, {
      tenantId: resolvedTenant.tenantId,
      leadId,
      changeSource: "meeting_note",
      changedBy: "admin",
      newSnapshot: { note_title: data.note_title },
    }).catch(() => undefined);

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("[meeting-notes POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
