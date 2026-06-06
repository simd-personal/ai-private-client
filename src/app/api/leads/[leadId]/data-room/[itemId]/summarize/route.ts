import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { generateDocumentSummary } from "@/lib/ai/generateDocumentSummary";
import { recordDataRoomEvent } from "@/lib/data-room/recordDataRoomEvent";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";
import type { DataRoomItem } from "@/lib/schemas/decision-layer";

export async function POST(
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
      resolvedTenant.tenantId,
      "id, tenant_id, quiz_data"
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const { data: item, error } = await supabase
      .from("decision_data_room_items")
      .select("*")
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    if (!item.storage_path) {
      return NextResponse.json(
        { error: "Upload a document before generating a summary" },
        { status: 400 }
      );
    }

    const quizData = lead.quiz_data as { privateClientContext?: { objective?: string } } | null;
    const summary = generateDocumentSummary({
      item: item as DataRoomItem,
      leadContext: {
        objective: quizData?.privateClientContext?.objective,
      },
    });

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await supabase
      .from("decision_data_room_items")
      .update({
        ai_document_summary: summary,
        ai_document_summary_generated_at: now,
        ai_document_summary_source: "placeholder",
        ai_document_summary_model: null,
        updated_at: now,
      })
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: "Failed to save summary" }, { status: 500 });
    }

    const advisorLabel = item.advisor_owner ?? "advisor";
    await recordDataRoomEvent(supabase, {
      tenantId: resolvedTenant.tenantId,
      leadId,
      changeSource: "data_room_document_summary",
      timelineMessage: `AI document summary generated for ${advisorLabel} review.`,
      snapshot: {
        itemId,
        item_name: item.item_name,
        summaryTitle: summary.summaryTitle,
      },
    }).catch((err) => console.error("[data-room summarize timeline]", err));

    return NextResponse.json({ summary, item: updated });
  } catch (error) {
    console.error("[data-room summarize]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
