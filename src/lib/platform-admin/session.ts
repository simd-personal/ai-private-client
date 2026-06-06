export const PLATFORM_ADMIN_TOKEN_STORAGE_KEY = "private_client_platform_admin_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getPlatformAdminToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return localStorage.getItem(PLATFORM_ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setPlatformAdminToken(token: string): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(PLATFORM_ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearPlatformAdminToken(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(PLATFORM_ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function hasPlatformAdminToken(): boolean {
  return Boolean(getPlatformAdminToken());
}

export const PLATFORM_ADMIN_SESSION_EXPIRED_EVENT =
  "platform-admin-session-expired";
export const PLATFORM_ADMIN_LOGOUT_EVENT = "platform-admin-logout";

export function logoutPlatformAdminSession(): void {
  clearPlatformAdminToken();
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(PLATFORM_ADMIN_LOGOUT_EVENT));
}
