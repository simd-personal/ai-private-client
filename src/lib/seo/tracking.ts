const SEO_PATH_PREFIXES = ["/tools", "/guides", "/areas"] as const;

const SEO_CTA_SESSION_KEY = "astoria_seo_cta";

export type SeoDestinationTool =
  | "home_match"
  | "seller_strategy"
  | "equity_move_up"
  | "wealth_forecast";

export interface SeoCtaSession {
  source_page: string;
  destination_tool: SeoDestinationTool;
}

export function isSeoPath(path?: string | null): boolean {
  if (!path) return false;
  return SEO_PATH_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export function destinationToolFromHref(href: string): SeoDestinationTool {
  if (href.startsWith("/seller")) return "seller_strategy";
  if (href.startsWith("/equity")) return "equity_move_up";
  if (href.startsWith("/wealth-forecast")) return "wealth_forecast";
  return "home_match";
}

export function destinationToolFromLeadType(
  leadType: "buyer" | "seller" | "equity" | "wealth_forecast"
): SeoDestinationTool {
  if (leadType === "seller") return "seller_strategy";
  if (leadType === "equity") return "equity_move_up";
  if (leadType === "wealth_forecast") return "wealth_forecast";
  return "home_match";
}

export function markSeoCtaSession(session: SeoCtaSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SEO_CTA_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* storage unavailable */
  }
}

export function getSeoCtaSession(): SeoCtaSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SEO_CTA_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SeoCtaSession;
  } catch {
    return null;
  }
}

export function clearSeoCtaSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SEO_CTA_SESSION_KEY);
  } catch {
    /* storage unavailable */
  }
}
