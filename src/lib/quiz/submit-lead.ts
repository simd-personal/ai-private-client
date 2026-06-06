import { messageFromLeadApiError } from "@/lib/quiz/submit-error";
import {
  appendTenantQuery,
  getTenantSlugFromPath,
} from "@/lib/tenants/tenant-paths";

export type LeadSubmitSuccess = {
  ok: true;
  leadId: string;
  token: string;
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast";
};

export type LeadSubmitFailure = {
  ok: false;
  message: string;
};

export type LeadSubmitResult = LeadSubmitSuccess | LeadSubmitFailure;

const REDIRECT_DELAY_MS = 750;

export function getRedirectDelayMs(): number {
  return REDIRECT_DELAY_MS;
}

export async function postLeadSubmission(
  body: Record<string, unknown>
): Promise<LeadSubmitResult> {
  try {
    const tenantSlug =
      typeof window !== "undefined"
        ? getTenantSlugFromPath(window.location.pathname)
        : null;
    const endpoint = appendTenantQuery("/api/leads", tenantSlug);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        ...(tenantSlug ? { tenantSlug } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { ok: false, message: messageFromLeadApiError(data) };
    }

    if (!data.token || !data.leadId) {
      return {
        ok: false,
        message: "Something went wrong. Please try again.",
      };
    }

    return {
      ok: true,
      leadId: data.leadId,
      token: data.token,
      leadType: data.leadType,
    };
  } catch {
    return { ok: false, message: "Network error. Please try again." };
  }
}
