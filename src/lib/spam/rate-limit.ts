/**
 * In-memory IP rate limiting for MVP.
 *
 * TODO: Replace with durable rate limiting (e.g. Upstash Redis, Vercel KV)
 * for production multi-instance deployments.
 */

const WINDOW_MS = 15 * 60 * 1000;

const LIMITS = {
  leads: { maxRequests: 10 },
  analytics: { maxRequests: 120 },
} as const;

export type RateLimitNamespace = keyof typeof LIMITS;

const ipHits = new Map<
  string,
  { count: number; windowStart: number }
>();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function bucketKey(namespace: RateLimitNamespace, ip: string): string {
  return `${namespace}:${ip}`;
}

/**
 * Returns true when the client should be blocked for this namespace.
 * Disabled in development so local testing is not blocked by analytics volume.
 */
export function isRateLimited(
  ip: string,
  namespace: RateLimitNamespace = "leads"
): boolean {
  if (process.env.NODE_ENV === "development") {
    return false;
  }

  const { maxRequests } = LIMITS[namespace];
  const key = bucketKey(namespace, ip);
  const now = Date.now();
  const entry = ipHits.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipHits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > maxRequests;
}

export function resetRateLimitForTesting(): void {
  ipHits.clear();
}
