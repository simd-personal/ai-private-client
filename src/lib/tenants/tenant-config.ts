export interface TenantConfig {
  id: string;
  slug: string;
  brandName: string;
  agentName: string;
  agentTitle: string;
  brokerageName: string;
  agentLicenseNumber: string;
  brokerageLicenseNumber: string;
  notificationEmail: string;
  contactEmail: string;
  phone: string;
  bookingUrl: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  supportedStates: string[];
  serviceAreas: string[];
  defaultState: string;
  disclaimerText: string;
  seoBaseTitle: string;
  seoBaseDescription: string;
}

const DEFAULT_NOTIFICATION_EMAIL = "leads@private-client-desk.local";
const DEFAULT_CONTACT_EMAIL = "hello@private-client-desk.local";
const DEFAULT_PHONE = "(949) 555-5555";
const DEFAULT_BOOKING_URL = "";

const PRIVATE_CLIENT_TENANT: TenantConfig = {
  id: "private-client",
  slug: "private-client",
  brandName: "Private Client Property Desk",
  agentName: "Your Advisory Team",
  agentTitle: "Licensed Real Estate & Advisory Coordination",
  brokerageName: "Private Client Advisory Group",
  agentLicenseNumber: "",
  brokerageLicenseNumber: "",
  notificationEmail:
    process.env.LEAD_NOTIFICATION_EMAIL?.trim() || DEFAULT_NOTIFICATION_EMAIL,
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || DEFAULT_CONTACT_EMAIL,
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE?.trim() || DEFAULT_PHONE,
  bookingUrl: process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || DEFAULT_BOOKING_URL,
  logoUrl: "",
  primaryColor: "#1a2332",
  accentColor: "#c9b896",
  supportedStates: ["CA"],
  serviceAreas: [
    "Newport Beach",
    "Irvine",
    "Costa Mesa",
    "Laguna Beach",
    "Orange County",
    "Aspen",
  ],
  defaultState: "CA",
  disclaimerText:
    "This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice. Tax topics should be reviewed with a CPA, legal and entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent.",
  seoBaseTitle: "Private Client Property Desk | AI Strategy Room",
  seoBaseDescription:
    "AI-powered planning and coordination for complex real estate decisions involving agents, wealth advisors, CPAs, attorneys, and lenders.",
};

const DEMO_AGENT_TENANT: TenantConfig = {
  id: "demo-agent",
  slug: "demo-agent",
  brandName: "Demo Family Office Desk",
  agentName: "Sarah Morgan",
  agentTitle: "Private Client Director",
  brokerageName: "Demo Advisory Group",
  agentLicenseNumber: "",
  brokerageLicenseNumber: "",
  notificationEmail: "demo@example.com",
  contactEmail: "demo@example.com",
  phone: "5555555555",
  bookingUrl: "https://example.com/book-demo-agent",
  logoUrl: "",
  primaryColor: "#1a2332",
  accentColor: "#c9b896",
  supportedStates: ["CA"],
  serviceAreas: ["Newport Beach", "Aspen", "Orange County"],
  defaultState: "CA",
  disclaimerText:
    "Demo tenant for multi-tenant preview. AI output is for planning coordination only — not professional advice.",
  seoBaseTitle: "Demo Family Office Desk | Private Client Property Desk",
  seoBaseDescription:
    "Demo workspace for private client real estate planning and advisor coordination.",
};

const TENANTS: Record<string, TenantConfig> = {
  "private-client": PRIVATE_CLIENT_TENANT,
  /** Backwards-compatible slug — maps to default Private Client tenant. */
  astoria: PRIVATE_CLIENT_TENANT,
  "demo-agent": DEMO_AGENT_TENANT,
};

export function getDefaultTenant(): TenantConfig {
  return PRIVATE_CLIENT_TENANT;
}

export function getTenantBySlug(slug?: string | null): TenantConfig {
  if (!slug) return getDefaultTenant();
  const normalized = slug.trim().toLowerCase();
  return TENANTS[normalized] ?? getDefaultTenant();
}

export function getTenantFromRequest(request: Request): TenantConfig {
  void request;
  return getDefaultTenant();
}

export function getTenantDisplayName(tenant = getDefaultTenant()): string {
  return tenant.brandName;
}

export function getTenantDisclaimer(tenant = getDefaultTenant()): string {
  return tenant.disclaimerText;
}

export function getTenantSupportedRegionLabel(
  tenant = getDefaultTenant()
): string {
  if (
    tenant.supportedStates.length === 1 &&
    tenant.supportedStates[0]?.toUpperCase() === "CA"
  ) {
    return "California";
  }
  return tenant.supportedStates.join(", ");
}

export function withTenantQuizDataMarkers<T extends Record<string, unknown>>(
  quizData: T,
  tenant = getDefaultTenant()
): T & { tenantSlug: string; tenantBrandName: string; tenantAgentName: string } {
  return {
    ...quizData,
    tenantSlug: tenant.slug,
    tenantBrandName: tenant.brandName,
    tenantAgentName: tenant.agentName,
  };
}
