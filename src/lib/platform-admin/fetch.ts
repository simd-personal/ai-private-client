import {
  PLATFORM_ADMIN_SESSION_EXPIRED_EVENT,
  clearPlatformAdminToken,
  getPlatformAdminToken,
} from "@/lib/platform-admin/session";

export async function platformAdminFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = getPlatformAdminToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (response.status === 401 && typeof window !== "undefined") {
    clearPlatformAdminToken();
    window.dispatchEvent(new CustomEvent(PLATFORM_ADMIN_SESSION_EXPIRED_EVENT));
  }

  return response;
}
