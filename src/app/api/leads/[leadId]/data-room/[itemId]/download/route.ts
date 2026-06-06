import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/admin/verify-admin";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import {
  DATA_ROOM_BUCKET,
  DATA_ROOM_SIGNED_URL_TTL_SECONDS,
} from "@/lib/data-room/upload-config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

export async function GET(
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

    const { data: item, error } = await supabase
      .from("decision_data_room_items")
      .select("storage_path, file_name")
      .eq("id", itemId)
      .eq("lead_id", leadId)
      .maybeSingle();

    if (error || !item?.storage_path) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const { data: signed, error: signError } = await supabase.storage
      .from(DATA_ROOM_BUCKET)
      .createSignedUrl(
        item.storage_path as string,
        DATA_ROOM_SIGNED_URL_TTL_SECONDS
      );

    if (signError || !signed?.signedUrl) {
      console.error("[data-room download]", signError);
      return NextResponse.json({ error: "Download failed" }, { status: 500 });
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error("[data-room download]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
