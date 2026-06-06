export function verifyPlatformAdmin(request: Request): boolean {
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!password) return false;

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  return authHeader.slice(7) === password;
}
