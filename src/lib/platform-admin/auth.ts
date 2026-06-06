function resolvePlatformAdminPassword(): string | undefined {
  const platform = process.env.PLATFORM_ADMIN_PASSWORD?.trim();
  if (platform) return platform;

  if (process.env.NODE_ENV === "development") {
    return process.env.ADMIN_PASSWORD?.trim() || undefined;
  }

  return undefined;
}

export function verifyPlatformAdmin(request: Request): boolean {
  const password = resolvePlatformAdminPassword();
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}
