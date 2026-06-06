import { NextResponse } from "next/server";
import {
  hashAnalyticsIp,
  insertSiteEvent,
} from "@/lib/analytics/server";
import { siteEventRequestSchema } from "@/lib/schemas/site-analytics";
import { getClientIp, isRateLimited } from "@/lib/spam/rate-limit";
import {
  resolveTenantBySlug,
  resolveTenantFromRequest,
} from "@/lib/tenants/tenant-resolver";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    if (isRateLimited(ip, "analytics")) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = siteEventRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid event", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent");
    const ipHash = hashAnalyticsIp(ip);
    const resolvedTenant = parsed.data.tenantSlug
      ? await resolveTenantBySlug(parsed.data.tenantSlug)
      : await resolveTenantFromRequest(request);

    await insertSiteEvent({
      sessionId: parsed.data.sessionId,
      eventName: parsed.data.eventName,
      pagePath: parsed.data.pagePath,
      referrer: parsed.data.referrer,
      attribution: parsed.data.attribution,
      metadata: parsed.data.metadata,
      userAgent,
      ipHash,
      tenantId: resolvedTenant.tenantId,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[analytics/events] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
