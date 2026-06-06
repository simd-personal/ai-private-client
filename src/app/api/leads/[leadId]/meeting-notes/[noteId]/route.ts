import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { generateMeetingSummary } from "@/lib/ai/generateMeetingSummary";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

const patchSchema = z.object({
  note_title: z.string().nullable().optional(),
  note_body: z.string().optional(),
  meeting_date: z.string().nullable().optional(),
  attendees: z.array(z.string()).optional(),
  regenerate_summary: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ leadId: string; noteId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, noteId } = await params;
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
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...body,
    };
    delete updates.regenerate_summary;

    if (body.regenerate_summary && body.note_body) {
      updates.ai_summary = generateMeetingSummary(body.note_body);
    }

    const { data, error } = await supabase
      .from("lead_meeting_notes")
      .update(updates)
      .eq("id", noteId)
      .eq("lead_id", leadId)
      .select("*")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ note: data });
  } catch (error) {
    console.error("[meeting-notes PATCH]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ leadId: string; noteId: string }> }
) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { leadId, noteId } = await params;
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
      .from("lead_meeting_notes")
      .delete()
      .eq("id", noteId)
      .eq("lead_id", leadId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[meeting-notes DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
