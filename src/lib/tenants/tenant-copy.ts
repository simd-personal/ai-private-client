import type { TenantConfig } from "@/lib/tenants/tenant-config";

/** Display label for consent and contact copy (handles generic agent names). */
export function getAdvisoryTeamLabel(tenant: TenantConfig): string {
  const generic =
    tenant.agentName.trim().toLowerCase() === "your advisory team";
  if (generic) {
    return `the ${tenant.brandName} advisory team`;
  }
  return `${tenant.agentName} at ${tenant.brandName}`;
}

export function getConsentText(tenant: TenantConfig): string {
  return `I agree to be contacted by ${getAdvisoryTeamLabel(tenant)} regarding my private property brief.`;
}

export function getContactStepTitle(): string {
  return "How should we reach you?";
}

export function getContactStepSubtitle(tenant: TenantConfig): string {
  return `Your information is kept private and used only for your ${tenant.brandName} private client brief.`;
}

export function getQuestionsForAdvisorLabel(tenant: TenantConfig): string {
  const generic =
    tenant.agentName.trim().toLowerCase() === "your advisory team";
  return generic
    ? "Questions for Advisory Review"
    : `Questions to Discuss with ${tenant.agentName}`;
}

export function getAdvisorReviewFallbackLabel(): string {
  return "To be confirmed during advisor review";
}
