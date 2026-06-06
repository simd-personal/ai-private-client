export function getTenantSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/a\/([a-z0-9-]+)(?:\/|$)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function buildTenantPath(path: string, tenantSlug?: string | null): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!tenantSlug) return normalizedPath;
  if (normalizedPath === "/") return `/a/${tenantSlug}`;
  return `/a/${tenantSlug}${normalizedPath}`;
}

export function tenantPathFromPathname(pathname: string, path: string): string {
  return buildTenantPath(path, getTenantSlugFromPath(pathname));
}

export function appendTenantQuery(path: string, tenantSlug?: string | null): string {
  if (!tenantSlug) return path;
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}tenant=${encodeURIComponent(tenantSlug)}`;
}
