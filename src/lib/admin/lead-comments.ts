import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadCommentType } from "@/lib/constants";

export const LEAD_COMMENT_SELECT_FIELDS =
  "id, lead_id, comment_text, comment_type, created_by, created_at, updated_at";

interface InsertLeadCommentInput {
  tenantId: string;
  leadId: string;
  commentText: string;
  commentType: LeadCommentType;
  createdBy?: string | null;
}

export async function insertLeadComment(
  supabase: SupabaseClient,
  input: InsertLeadCommentInput
): Promise<void> {
  const { error } = await supabase.from("lead_comments").insert({
    tenant_id: input.tenantId,
    lead_id: input.leadId,
    comment_text: input.commentText,
    comment_type: input.commentType,
    created_by: input.createdBy ?? null,
  });
  if (error) {
    console.error("[lead-comments] insert failed:", error.message);
  }
}

/**
 * Resolves the lead row for the resolved tenant, or null if it does not belong
 * to the tenant. When tenantId is null (legacy untenanted), matches null.
 */
export async function fetchTenantScopedLead(
  supabase: SupabaseClient,
  leadId: string,
  tenantId: string | null,
  columns = "id, tenant_id"
): Promise<Record<string, unknown> | null> {
  const query = supabase.from("leads").select(columns).eq("id", leadId);
  if (tenantId) {
    query.eq("tenant_id", tenantId);
  } else {
    query.is("tenant_id", null);
  }
  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as unknown as Record<string, unknown>;
}
