import type { APIRequestContext } from "@playwright/test";
import {
  buildBypassHeaders,
  getBaseUrl,
  getPlatformPassword,
  shouldResetDemo,
} from "./config";

export interface MercerDemoLinks {
  tenantSlug: string;
  leadId: string;
  token: string;
  publicResultUrl: string;
  adminLeadUrl: string;
  presentationUrl: string;
  landingUrl: string;
}

function platformAuthHeaders(): Record<string, string> {
  const password = getPlatformPassword();
  if (!password) {
    throw new Error(
      "E2E_PLATFORM_ADMIN_PASSWORD is required for demo API access."
    );
  }

  return {
    ...buildBypassHeaders(),
    Authorization: `Bearer ${password}`,
  };
}

export async function getMercerDemoStatus(
  request: APIRequestContext
): Promise<MercerDemoLinks | null> {
  const res = await request.get("/api/platform/demo/mercer-newport/reset", {
    headers: platformAuthHeaders(),
  });

  if (res.status() === 401) {
    throw new Error(
      "Platform demo API returned 401. Check E2E_PLATFORM_ADMIN_PASSWORD and Vercel bypass settings."
    );
  }

  if (!res.ok()) {
    const snippet = (await res.text()).slice(0, 200);
    throw new Error(`Demo status request failed (${res.status()}): ${snippet}`);
  }

  const json = (await res.json()) as { status?: MercerDemoLinks | null };
  return json.status ?? null;
}

export async function resetMercerDemo(
  request: APIRequestContext
): Promise<MercerDemoLinks> {
  const res = await request.post("/api/platform/demo/mercer-newport/reset", {
    headers: platformAuthHeaders(),
  });

  if (!res.ok()) {
    const snippet = (await res.text()).slice(0, 200);
    throw new Error(`Demo reset failed (${res.status()}): ${snippet}`);
  }

  return (await res.json()) as MercerDemoLinks;
}

export async function getLatestDemoLinks(
  request: APIRequestContext
): Promise<MercerDemoLinks> {
  if (shouldResetDemo()) {
    return resetMercerDemo(request);
  }

  const status = await getMercerDemoStatus(request);
  if (!status?.leadId || !status.publicResultUrl) {
    throw new Error(
      "No Mercer demo lead found. Run npm run demo:mercer against production env or set E2E_RESET_DEMO=true."
    );
  }

  return status;
}

export function assertProductionReachable(statusCode: number): void {
  if (statusCode === 401) {
    throw new Error(
      "Production URL is protected. Set E2E_VERCEL_BYPASS_SECRET or disable Vercel protection for this deployment."
    );
  }
}

export { getBaseUrl };
