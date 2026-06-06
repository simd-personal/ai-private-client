import { after } from "next/server";
import { NextResponse } from "next/server";
import { hashAnalyticsIp } from "@/lib/analytics/server";
import { scheduleLeadGenerationPipeline } from "@/lib/ai/runLeadGenerationPipeline";
import { processLeadSubmission } from "@/lib/leads/process-submission";
import {
  isHoneypotTriggered,
  leadApiRequestSchema,
} from "@/lib/schemas/lead-api";
import { getClientIp, isRateLimited } from "@/lib/spam/rate-limit";
import {
  resolveTenantBySlug,
  resolveTenantFromRequest,
} from "@/lib/tenants/tenant-resolver";
import { buildTenantResultUrl } from "@/lib/tenants/tenant-paths";
import {
  trackLeadSubmitStarted,
  trackLeadWorkspaceCreated,
} from "@/lib/analytics";

export async function POST(request: Request) {
  try {
    trackLeadSubmitStarted();

    const ip = getClientIp(request);
    if (isRateLimited(ip, "leads")) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = leadApiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid submission", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (isHoneypotTriggered(parsed.data.honeypot)) {
      console.warn("Lead API: honeypot triggered");
      return NextResponse.json(
        {
          error:
            "Submission blocked. If you use a password manager, try again in a private window or disable autofill for this site.",
        },
        { status: 400 }
      );
    }

    const resolvedTenant = parsed.data.tenantSlug
      ? await resolveTenantBySlug(parsed.data.tenantSlug)
      : await resolveTenantFromRequest(request);
    const userAgent = request.headers.get("user-agent");

    const result = await processLeadSubmission(parsed.data, {
      userAgent,
      ipHash: hashAnalyticsIp(ip),
      tenantId: resolvedTenant.tenantId,
      tenant: resolvedTenant.tenant,
    });

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? new URL(request.url).origin;
    const resultUrl = buildTenantResultUrl(
      resolvedTenant.tenant.slug,
      result.token,
      siteUrl
    );

    if (result.scheduleBackground) {
      after(() => {
        scheduleLeadGenerationPipeline({
          leadId: result.leadId,
          tenantId: resolvedTenant.tenantId,
          tenant: resolvedTenant.tenant,
          mode: "background",
        });
      });
    }

    trackLeadWorkspaceCreated({
      lead_id: result.leadId,
      lead_type: result.leadType,
      async: result.scheduleBackground ? 1 : 0,
    });

    return NextResponse.json({
      success: true,
      leadId: result.leadId,
      token: result.token,
      leadType: result.leadType,
      resultUrl,
      generationStatus: result.generationStatus ?? "complete",
    });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
