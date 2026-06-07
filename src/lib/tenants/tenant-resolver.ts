import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeHostForMatch } from "@/lib/platform-admin/domain-utils";
import {
  getDefaultTenant,
  getTenantBySlug,
  type TenantConfig,
} from "@/lib/tenants/tenant-config";

interface TenantRow {
  id: string;
  slug: string;
  brand_name: string;
  agent_name: string;
  agent_title: string | null;
  brokerage_name: string | null;
  agent_license_number: string | null;
  brokerage_license_number: string | null;
  notification_email: string | null;
  contact_email: string | null;
  phone: string | null;
  booking_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  supported_states: string[] | null;
  service_areas: string[] | null;
  default_state: string | null;
  disclaimer_text: string | null;
  seo_base_title: string | null;
  seo_base_description: string | null;
  custom_domain: string | null;
}

export interface ResolvedTenant {
  tenantId: string | null;
  tenant: TenantConfig;
}

function sanitizeSlug(slug?: string | null): string | null {
  const next = slug?.trim().toLowerCase();
  if (!next) return null;
  return next.replace(/[^a-z0-9-]/g, "");
}

function toTenantConfig(row: TenantRow): TenantConfig {
  const fallback = getTenantBySlug(row.slug);
  return {
    id: row.id,
    slug: row.slug,
    brandName: row.brand_name,
    agentName: row.agent_name,
    agentTitle: row.agent_title ?? fallback.agentTitle,
    brokerageName: row.brokerage_name ?? fallback.brokerageName,
    agentLicenseNumber:
      row.agent_license_number ?? fallback.agentLicenseNumber,
    brokerageLicenseNumber:
      row.brokerage_license_number ?? fallback.brokerageLicenseNumber,
    notificationEmail: row.notification_email ?? fallback.notificationEmail,
    contactEmail: row.contact_email ?? fallback.contactEmail,
    phone: row.phone ?? fallback.phone,
    bookingUrl: row.booking_url ?? fallback.bookingUrl,
    logoUrl: row.logo_url ?? fallback.logoUrl,
    primaryColor: row.primary_color ?? fallback.primaryColor,
    accentColor: row.accent_color ?? fallback.accentColor,
    supportedStates:
      row.supported_states?.length ? row.supported_states : fallback.supportedStates,
    serviceAreas: row.service_areas ?? fallback.serviceAreas,
    defaultState: row.default_state ?? fallback.defaultState,
    disclaimerText: row.disclaimer_text ?? fallback.disclaimerText,
    seoBaseTitle: row.seo_base_title ?? fallback.seoBaseTitle,
    seoBaseDescription: row.seo_base_description ?? fallback.seoBaseDescription,
  };
}

async function fetchTenantBySlug(slug: string): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[tenant-resolver] slug lookup failed:", error.message);
    return null;
  }
  return (data as TenantRow | null) ?? null;
}

async function fetchTenantRowById(tenantId: string): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .maybeSingle();
  if (error) {
    console.error("[tenant-resolver] tenant id lookup failed:", error.message);
    return null;
  }
  return (data as TenantRow | null) ?? null;
}

async function fetchTenantByActiveDomain(
  hostname: string
): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenant_domains")
    .select("tenant_id")
    .eq("domain", hostname)
    .eq("status", "active")
    .maybeSingle();
  if (error) {
    console.error(
      "[tenant-resolver] active domain lookup failed:",
      error.message
    );
    return null;
  }
  const tenantId = (data as { tenant_id?: string } | null)?.tenant_id;
  if (!tenantId) return null;
  return fetchTenantRowById(tenantId);
}

async function fetchTenantByDomain(hostname: string): Promise<TenantRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("custom_domain", hostname)
    .maybeSingle();
  if (error) {
    console.error("[tenant-resolver] domain lookup failed:", error.message);
    return null;
  }
  return (data as TenantRow | null) ?? null;
}

function hostFromRequest(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = forwarded ?? request.headers.get("host");
  if (!host) return null;
  const normalized = normalizeHostForMatch(host);
  return normalized || null;
}

function slugFromTenantPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  const marker = parts.findIndex((part) => part === "a");
  if (marker < 0) return null;
  return sanitizeSlug(parts[marker + 1] ?? null);
}

export async function resolveDefaultTenant(): Promise<ResolvedTenant> {
  const fallback = getDefaultTenant();
  const row = await fetchTenantBySlug(fallback.slug);
  if (!row) {
    return { tenantId: null, tenant: fallback };
  }
  return { tenantId: row.id, tenant: toTenantConfig(row) };
}

export async function resolveTenantById(
  tenantId?: string | null
): Promise<ResolvedTenant> {
  if (!tenantId) return resolveDefaultTenant();
  const row = await fetchTenantRowById(tenantId);
  if (!row) return resolveDefaultTenant();
  return { tenantId: row.id, tenant: toTenantConfig(row) };
}

export async function findTenantBySlug(
  slug?: string | null
): Promise<ResolvedTenant | null> {
  const normalized = sanitizeSlug(slug);
  if (!normalized) return null;
  const row = await fetchTenantBySlug(normalized);
  if (!row) return null;
  return { tenantId: row.id, tenant: toTenantConfig(row) };
}

export async function resolveTenantBySlug(
  slug?: string | null
): Promise<ResolvedTenant> {
  const found = await findTenantBySlug(slug);
  if (found) return found;
  return resolveDefaultTenant();
}

export async function resolveTenantFromRequest(
  request: Request
): Promise<ResolvedTenant> {
  const url = new URL(request.url);

  // 1. Active tenant_domains match takes precedence so a tenant served on its
  //    own domain resolves correctly even at the root path.
  const host = hostFromRequest(request);
  if (host) {
    const activeDomainMatch = await fetchTenantByActiveDomain(host);
    if (activeDomainMatch) {
      return {
        tenantId: activeDomainMatch.id,
        tenant: toTenantConfig(activeDomainMatch),
      };
    }
  }

  // 2. Legacy tenants.custom_domain match.
  if (host) {
    const legacyDomainMatch = await fetchTenantByDomain(host);
    if (legacyDomainMatch) {
      return {
        tenantId: legacyDomainMatch.id,
        tenant: toTenantConfig(legacyDomainMatch),
      };
    }
  }

  // 3. Explicit ?tenant= query param.
  const querySlug = sanitizeSlug(url.searchParams.get("tenant"));
  if (querySlug) {
    return resolveTenantBySlug(querySlug);
  }

  // 4. /a/{tenantSlug} route segment.
  const pathSlug = slugFromTenantPath(url.pathname);
  if (pathSlug) {
    return resolveTenantBySlug(pathSlug);
  }

  // 5. Default Private Client tenant fallback.
  return resolveDefaultTenant();
}
