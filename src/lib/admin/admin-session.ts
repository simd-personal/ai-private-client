export const ADMIN_TOKEN_STORAGE_KEY = "private_client_admin_token";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAdminToken(): string | null {
  if (!isBrowser()) return null;

  try {
    return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export function clearAdminToken(): void {
  if (!isBrowser()) return;

  try {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable */
  }
}

export function hasAdminToken(): boolean {
  return Boolean(getAdminToken());
}

export const ADMIN_SESSION_EXPIRED_EVENT = "admin-session-expired";
export const ADMIN_LOGOUT_EVENT = "admin-logout";

export function logoutAdminSession(): void {
  clearAdminToken();
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(ADMIN_LOGOUT_EVENT));
}
