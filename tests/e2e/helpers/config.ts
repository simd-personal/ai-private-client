export function getBaseUrl(): string {
  return (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getAdminPassword(): string | undefined {
  return (
    process.env.E2E_ADMIN_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    undefined
  );
}

function isLocalE2eTarget(): boolean {
  const base = process.env.E2E_BASE_URL?.trim();
  if (!base) return true;
  try {
    const { hostname } = new URL(base);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function getPlatformPassword(): string | undefined {
  const explicit =
    process.env.E2E_PLATFORM_ADMIN_PASSWORD?.trim() ||
    process.env.PLATFORM_ADMIN_PASSWORD?.trim();
  if (explicit) return explicit;

  if (isLocalE2eTarget()) {
    return getAdminPassword();
  }

  return undefined;
}

export function getVercelBypassSecret(): string | undefined {
  return (
    process.env.E2E_VERCEL_BYPASS_SECRET ||
    process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
    undefined
  );
}

export function shouldResetDemo(): boolean {
  return process.env.E2E_RESET_DEMO === "true";
}

export function shouldTestUploads(): boolean {
  return process.env.E2E_TEST_UPLOADS === "true";
}

export function shouldCreateLeads(): boolean {
  return process.env.E2E_CREATE_LEADS === "true";
}

/** Redact secrets before logging. Never log raw bypass tokens or passwords. */
export function redactSecret(value: string | undefined): string {
  if (!value) return "(not set)";
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}…${value.slice(-2)} (${value.length} chars)`;
}

export function buildBypassHeaders(): Record<string, string> {
  const secret = getVercelBypassSecret();
  return secret ? { "x-vercel-protection-bypass": secret } : {};
}

export function toRelativeAppPath(url: string, baseUrl = getBaseUrl()): string {
  try {
    const parsed = new URL(url);
    const base = new URL(baseUrl);
    if (parsed.origin === base.origin) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return url;
  } catch {
    return url;
  }
}
