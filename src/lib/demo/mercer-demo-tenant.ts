import type { SupabaseClient } from "@supabase/supabase-js";
import type { TenantConfig } from "@/lib/tenants/tenant-config";
import { getTenantBySlug } from "@/lib/tenants/tenant-config";

export const MERCER_DEMO_SLUG = "mercer-newport-demo";
export const MERCER_DEMO_SCENARIO = "mercer-newport-aspen-transition";

export interface MercerDemoTenantRow {
  id: string;
  slug: string;
  brand_name: string;
  agent_name: string;
  agent_title: string | null;
  brokerage_name: string | null;
  notification_email: string | null;
  contact_email: string | null;
  phone: string | null;
  disclaimer_text: string | null;
  seo_base_title: string | null;
  seo_base_description: string | null;
  supported_states: string[] | null;
  service_areas: string[] | null;
  default_state: string | null;
}

export function mercerDemoTenantConfig(row: MercerDemoTenantRow): TenantConfig {
  const fallback = getTenantBySlug(MERCER_DEMO_SLUG);
  return {
    id: row.id,
    slug: row.slug,
    brandName: row.brand_name,
    agentName: row.agent_name,
    agentTitle: row.agent_title ?? fallback.agentTitle,
    brokerageName: row.brokerage_name ?? fallback.brokerageName,
    agentLicenseNumber: "",
    brokerageLicenseNumber: "",
    notificationEmail: row.notification_email ?? fallback.notificationEmail,
    contactEmail: row.contact_email ?? fallback.contactEmail,
    phone: row.phone ?? fallback.phone,
    bookingUrl: fallback.bookingUrl,
    logoUrl: "",
    primaryColor: fallback.primaryColor,
    accentColor: fallback.accentColor,
    supportedStates: row.supported_states ?? fallback.supportedStates,
    serviceAreas: row.service_areas ?? fallback.serviceAreas,
    defaultState: row.default_state ?? fallback.defaultState,
    disclaimerText: row.disclaimer_text ?? fallback.disclaimerText,
    seoBaseTitle: row.seo_base_title ?? fallback.seoBaseTitle,
    seoBaseDescription: row.seo_base_description ?? fallback.seoBaseDescription,
  };
}

export async function upsertMercerDemoTenant(
  supabase: SupabaseClient
): Promise<{ tenantId: string; tenant: TenantConfig }> {
  const { data: existing } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", MERCER_DEMO_SLUG)
    .maybeSingle();

  if (existing) {
    return {
      tenantId: existing.id as string,
      tenant: mercerDemoTenantConfig(existing as MercerDemoTenantRow),
    };
  }

  const fallback = getTenantBySlug(MERCER_DEMO_SLUG);
  const { data: inserted, error } = await supabase
    .from("tenants")
    .insert({
      slug: MERCER_DEMO_SLUG,
      brand_name: "Private Property Planning Desk",
      agent_name: "Mercer Newport Beach Advisory Team",
      agent_title: "Private Wealth Advisory Team",
      brokerage_name: "Mercer Advisors Demo",
      notification_email: "demo@private-client-desk.local",
      contact_email: "demo@private-client-desk.local",
      phone: "(949) 555-0199",
      supported_states: ["CA", "CO"],
      service_areas: [
        "Newport Beach",
        "Orange County",
        "Aspen",
        "Los Angeles",
        "Southern California",
      ],
      default_state: "CA",
      disclaimer_text:
        "This private brief is for planning and coordination purposes only. It is not legal, tax, lending, investment, appraisal, or valuation advice. Tax topics should be reviewed with a CPA, legal/entity topics with an attorney, lending topics with a lender or private banker, and real estate execution topics with a licensed agent. Demo tenant only — example workflow; not affiliated with or endorsed by Mercer Advisors.",
      seo_base_title: "Private Property Planning Desk | Demo",
      seo_base_description:
        "Demo private client property planning workspace — example wealth advisory coordination (not affiliated with Mercer Advisors).",
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create Mercer demo tenant");
  }

  void fallback;

  return {
    tenantId: inserted.id as string,
    tenant: mercerDemoTenantConfig(inserted as MercerDemoTenantRow),
  };
}

export async function deleteMercerDemoLeads(
  supabase: SupabaseClient,
  tenantId: string
): Promise<number> {
  const { data: leads } = await supabase
    .from("leads")
    .select("id, quiz_data")
    .eq("tenant_id", tenantId);

  const demoLeadIds =
    leads
      ?.filter(
        (lead) =>
          (lead.quiz_data as { demoScenario?: string } | null)?.demoScenario ===
          MERCER_DEMO_SCENARIO
      )
      .map((lead) => lead.id as string) ?? [];

  if (demoLeadIds.length === 0) return 0;

  const { error } = await supabase.from("leads").delete().in("id", demoLeadIds);
  if (error) throw new Error(error.message);
  return demoLeadIds.length;
}

export function buildMercerDemoUrls(
  leadId: string,
  token: string,
  siteUrl: string
) {
  const base = siteUrl.replace(/\/$/, "");
  return {
    publicResultUrl: `${base}/a/${MERCER_DEMO_SLUG}/result?token=${encodeURIComponent(token)}`,
    adminLeadUrl: `${base}/a/${MERCER_DEMO_SLUG}/admin/leads/${leadId}`,
    presentationUrl: `${base}/a/${MERCER_DEMO_SLUG}/admin/leads/${leadId}/present`,
    landingUrl: `${base}/a/${MERCER_DEMO_SLUG}`,
  };
}
