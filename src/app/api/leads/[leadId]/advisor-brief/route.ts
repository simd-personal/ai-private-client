import { NextResponse } from "next/server";
import { z } from "zod";
import { buildIntakeContext, type LeadType } from "@/lib/ai/intake-context";
import { generateStrategyRoom } from "@/lib/ai/generateStrategyRoom";
import { fetchTenantScopedLead } from "@/lib/admin/lead-comments";
import {
  ADVISOR_TYPES,
  getAdvisorBriefByType,
} from "@/lib/schemas/ai-strategy-room";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

function verifyAdmin(request: Request): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}

const bodySchema = z.object({
  advisorType: z.enum(ADVISOR_TYPES),
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
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid advisorType" }, { status: 400 });
    }

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

    const quizData = lead.quiz_data as Parameters<typeof buildIntakeContext>[1];
    const leadType = lead.lead_type as LeadType;
    const ctx = buildIntakeContext(leadType, quizData);
    const { output } = await generateStrategyRoom(ctx, resolvedTenant.tenant);
    const brief = getAdvisorBriefByType(
      output.advisorSpecificBriefs,
      parsed.data.advisorType
    );

    return NextResponse.json({ brief, advisorType: parsed.data.advisorType });
  } catch (error) {
    console.error("[advisor-brief] error:", error);
    return NextResponse.json(
      { error: "Failed to generate advisor brief" },
      { status: 500 }
    );
  }
}
