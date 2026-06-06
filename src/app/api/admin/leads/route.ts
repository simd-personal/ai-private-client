import { NextResponse } from "next/server";
import { z } from "zod";
import { LEAD_PIPELINE_STATUSES, LEAD_STATUSES } from "@/lib/constants";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";
import {
  fetchTenantScopedLead,
  insertLeadComment,
} from "@/lib/admin/lead-comments";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    const supabase = getSupabaseAdmin();
    const query = supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (resolvedTenant.tenantId) {
      query.eq("tenant_id", resolvedTenant.tenantId);
    } else {
      query.is("tenant_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Admin leads fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch leads" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      leads: data ?? [],
      tenantBrandName: resolvedTenant.tenant.brandName,
    });
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const toNullIfBlank = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return null;
  return value;
};

const optionalDateField = z.preprocess(
  toNullIfBlank,
  z.string().datetime({ offset: true }).nullable().optional()
);

const optionalNumberField = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}, z.number().nonnegative().nullable().optional());

const updateLeadSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().optional(),
  propertyAdminNotes: z.string().optional(),
  // CRM pipeline fields
  lead_status: z.enum(LEAD_PIPELINE_STATUSES).optional(),
  last_contacted_at: optionalDateField,
  next_follow_up_at: optionalDateField,
  lead_notes: z.preprocess(
    toNullIfBlank,
    z.string().max(5000).nullable().optional()
  ),
  lost_reason: z.preprocess(
    toNullIfBlank,
    z.string().max(2000).nullable().optional()
  ),
  estimated_deal_value: optionalNumberField,
  estimated_commission: optionalNumberField,
  closed_at: optionalDateField,
});

function formatDateForComment(value: string | null): string {
  if (!value) return "unset";
  return new Date(value).toLocaleString();
}

function formatCurrencyForComment(value: number | null): string {
  if (value == null) return "unset";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function datesEqual(a: string | null, b: string | null): boolean {
  const aTime = a ? new Date(a).getTime() : null;
  const bTime = b ? new Date(b).getTime() : null;
  return aTime === bTime;
}

export async function PATCH(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resolvedTenant = await resolveTenantFromRequest(request);
    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      leadId,
      status,
      notes,
      propertyAdminNotes,
      lead_status,
      last_contacted_at,
      next_follow_up_at,
      lead_notes,
      lost_reason,
      estimated_deal_value,
      estimated_commission,
      closed_at,
    } = parsed.data;

    const crmKeys = [
      lead_status,
      last_contacted_at,
      next_follow_up_at,
      lead_notes,
      lost_reason,
      estimated_deal_value,
      estimated_commission,
      closed_at,
    ];
    const hasCrmUpdate = crmKeys.some((value) => value !== undefined);

    if (
      status === undefined &&
      notes === undefined &&
      propertyAdminNotes === undefined &&
      !hasCrmUpdate
    ) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const tenantId = resolvedTenant.tenantId;

    // Load the existing lead (tenant-scoped) for ownership + change detection.
    const existing = await fetchTenantScopedLead(
      supabase,
      leadId,
      tenantId,
      "id, lead_type, quiz_data, lead_status, last_contacted_at, next_follow_up_at, estimated_commission, closed_at"
    );

    if (!existing) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Seller property admin notes live inside quiz_data.
    if (propertyAdminNotes !== undefined) {
      if (existing.lead_type !== "seller") {
        return NextResponse.json(
          { error: "Property admin notes apply to seller leads only" },
          { status: 400 }
        );
      }

      const quizData =
        typeof existing.quiz_data === "object" && existing.quiz_data !== null
          ? (existing.quiz_data as Record<string, unknown>)
          : {};

      const quizUpdateQuery = supabase
        .from("leads")
        .update({ quiz_data: { ...quizData, propertyAdminNotes } })
        .eq("id", leadId);
      if (tenantId) {
        quizUpdateQuery.eq("tenant_id", tenantId);
      } else {
        quizUpdateQuery.is("tenant_id", null);
      }
      const { error: quizUpdateError } = await quizUpdateQuery;
      if (quizUpdateError) {
        console.error("Admin property notes update error:", quizUpdateError);
        return NextResponse.json(
          { error: "Failed to update property notes" },
          { status: 500 }
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.admin_notes = notes;

    if (lead_status !== undefined) updates.lead_status = lead_status;
    if (last_contacted_at !== undefined)
      updates.last_contacted_at = last_contacted_at;
    if (next_follow_up_at !== undefined)
      updates.next_follow_up_at = next_follow_up_at;
    if (lead_notes !== undefined) updates.lead_notes = lead_notes;
    if (lost_reason !== undefined) updates.lost_reason = lost_reason;
    if (estimated_deal_value !== undefined)
      updates.estimated_deal_value = estimated_deal_value;
    if (estimated_commission !== undefined)
      updates.estimated_commission = estimated_commission;
    if (closed_at !== undefined) updates.closed_at = closed_at;

    const oldStatus = (existing.lead_status as string | null) ?? "new";
    const nowIso = new Date().toISOString();

    // Rule: contacted with no last_contacted_at -> stamp now.
    if (
      lead_status === "contacted" &&
      !existing.last_contacted_at &&
      last_contacted_at === undefined
    ) {
      updates.last_contacted_at = nowIso;
    }

    // Rule: closed with no closed_at -> stamp now.
    if (
      lead_status === "closed" &&
      !existing.closed_at &&
      closed_at === undefined
    ) {
      updates.closed_at = nowIso;
    }

    if (Object.keys(updates).length > 0) {
      const updateQuery = supabase
        .from("leads")
        .update(updates)
        .eq("id", leadId);
      if (tenantId) {
        updateQuery.eq("tenant_id", tenantId);
      } else {
        updateQuery.is("tenant_id", null);
      }
      const { error: updateError } = await updateQuery;
      if (updateError) {
        console.error("Admin update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update lead" },
          { status: 500 }
        );
      }
    }

    // System comments (only on real changes, only when tenant is known).
    if (tenantId) {
      if (lead_status !== undefined && lead_status !== oldStatus) {
        await insertLeadComment(supabase, {
          tenantId,
          leadId,
          commentType: "status_change",
          commentText: `Status changed from ${oldStatus} to ${lead_status}`,
          createdBy: "system",
        });
      }

      if (
        next_follow_up_at !== undefined &&
        !datesEqual(
          (existing.next_follow_up_at as string | null) ?? null,
          next_follow_up_at ?? null
        )
      ) {
        await insertLeadComment(supabase, {
          tenantId,
          leadId,
          commentType: "system",
          commentText: `Next follow up changed to ${formatDateForComment(
            next_follow_up_at ?? null
          )}`,
          createdBy: "system",
        });
      }

      const oldCommission =
        (existing.estimated_commission as number | null) ?? null;
      if (
        estimated_commission !== undefined &&
        oldCommission !== (estimated_commission ?? null)
      ) {
        await insertLeadComment(supabase, {
          tenantId,
          leadId,
          commentType: "system",
          commentText: `Estimated commission updated to ${formatCurrencyForComment(
            estimated_commission ?? null
          )}`,
          createdBy: "system",
        });
      }
    }

    // Return the refreshed lead row.
    const refreshedQuery = supabase
      .from("leads")
      .select("*")
      .eq("id", leadId);
    if (tenantId) {
      refreshedQuery.eq("tenant_id", tenantId);
    } else {
      refreshedQuery.is("tenant_id", null);
    }
    const { data: refreshed, error: refreshedError } =
      await refreshedQuery.single();

    if (refreshedError) {
      console.error("Admin refresh error:", refreshedError);
      return NextResponse.json(
        { error: "Failed to load updated lead" },
        { status: 500 }
      );
    }

    await supabase.from("lead_events").insert({
      lead_id: leadId,
      event_type: "lead_updated",
      event_data: updates,
    });

    return NextResponse.json({ lead: refreshed });
  } catch (error) {
    console.error("Admin PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
