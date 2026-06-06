import { NextResponse } from "next/server";
import { resolveTenantFromRequest } from "@/lib/tenants/tenant-resolver";

export async function GET(request: Request) {
  try {
    const resolved = await resolveTenantFromRequest(request);
    const tenant = resolved.tenant;

    return NextResponse.json({
      tenant: {
        slug: tenant.slug,
        brandName: tenant.brandName,
        agentName: tenant.agentName,
        agentTitle: tenant.agentTitle,
        brokerageName: tenant.brokerageName,
        bookingUrl: tenant.bookingUrl,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        accentColor: tenant.accentColor,
        supportedStates: tenant.supportedStates,
        serviceAreas: tenant.serviceAreas,
        defaultState: tenant.defaultState,
        disclaimerText: tenant.disclaimerText,
        seoBaseTitle: tenant.seoBaseTitle,
        seoBaseDescription: tenant.seoBaseDescription,
      },
    });
  } catch (error) {
    console.error("[tenant] resolve failed:", error);
    return NextResponse.json(
      { error: "Failed to resolve tenant" },
      { status: 500 }
    );
  }
}
