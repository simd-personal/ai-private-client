import { NextResponse } from "next/server";
import { hashAnalyticsIp } from "@/lib/analytics/server";
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

export async function POST(request: Request) {
  try {
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

    return NextResponse.json({
      leadId: result.leadId,
      token: result.token,
      leadType: result.leadType,
    });
  } catch (error) {
    console.error("Lead API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
