import {
  ADMIN_SESSION_EXPIRED_EVENT,
  clearAdminToken,
  getAdminToken,
} from "@/lib/admin/admin-session";
import {
  appendTenantQuery,
  getTenantSlugFromPath,
} from "@/lib/tenants/tenant-paths";

export async function adminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const inputUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : String(input);

  const tenantSlug =
    typeof window !== "undefined"
      ? getTenantSlugFromPath(window.location.pathname)
      : null;
  const scopedInput =
    inputUrl.startsWith("/api/admin/") || inputUrl.startsWith("/api/leads/")
      ? appendTenantQuery(inputUrl, tenantSlug)
      : inputUrl;

  const response = await fetch(scopedInput, {
    ...init,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearAdminToken();
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT));
  }

  return response;
}
