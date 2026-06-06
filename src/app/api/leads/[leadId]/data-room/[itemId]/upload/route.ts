import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import { sanitizeFilename } from "@/lib/data-room/sanitizeFilename";
import { recordDataRoomEvent } from "@/lib/data-room/recordDataRoomEvent";
import {
  DATA_ROOM_ALLOWED_MIME_TYPES,
  DATA_ROOM_BUCKET,
  DATA_ROOM_MAX_FILE_SIZE_BYTES,
} from "@/lib/data-room/upload-config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

async function fetchDataRoomItem(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  leadId: string,
  itemId: string
) {
  const { data, error } = await supabase
    .from("decision_data_room_items")
    .select("*")
    .eq("id", itemId)
    .eq("lead_id", leadId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

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
      resolvedTenant.tenantId
    );
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const existingItem = await fetchDataRoomItem(supabase, leadId, itemId);
    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty" }, { status: 400 });
    }

    if (file.size > DATA_ROOM_MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 413 });
    }

    const ext = DATA_ROOM_ALLOWED_MIME_TYPES.get(file.type);
    if (!ext) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 }
      );
    }

    const tenantId = resolvedTenant.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const timestamp = Date.now();
    const safeName = sanitizeFilename(file.name);
    const storagePath = `tenant/${tenantId}/leads/${leadId}/data-room/${itemId}/${timestamp}-${safeName}`;

    if (existingItem.storage_path) {
      await supabase.storage
        .from(DATA_ROOM_BUCKET)
        .remove([existingItem.storage_path as string])
        .catch(() => undefined);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(DATA_ROOM_BUCKET)
      .upload(storagePath, bytes, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("[data-room upload]", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const now = new Date().toISOString();
    const isReplace = Boolean(existingItem.storage_path);
    const { data: item, error: updateError } = await supabase
      .from("decision_data_room_items")
      .update({
        storage_path: storagePath,
        file_name: file.name,
        file_mime_type: file.type,
        file_size_bytes: file.size,
        status: "received",
        updated_at: now,
        ai_document_summary: null,
        ai_document_summary_generated_at: null,
        ai_document_summary_source: null,
        ai_document_summary_model: null,
      })
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .select("*")
      .single();

    if (updateError || !item) {
      await supabase.storage.from(DATA_ROOM_BUCKET).remove([storagePath]);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const timelineMessage = isReplace
      ? `${item.item_name} file replaced for advisor review.`
      : `${item.item_name} uploaded for advisor review.`;

    await recordDataRoomEvent(supabase, {
      tenantId,
      leadId,
      changeSource: isReplace ? "data_room_file_replaced" : "data_room_file_uploaded",
      timelineMessage,
      snapshot: {
        itemId,
        item_name: item.item_name,
        status: item.status,
        file_name: item.file_name,
      },
    }).catch((err) => console.error("[data-room upload timeline]", err));

    return NextResponse.json({
      success: true,
      item,
      uploadedAt: now,
      fileName: item.file_name,
      fileSizeBytes: item.file_size_bytes,
    });
  } catch (error) {
    console.error("[data-room upload]", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
