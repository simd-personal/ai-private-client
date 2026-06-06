export const DOMAIN_STATUSES = [
  "pending",
  "verified",
  "active",
  "failed",
] as const;

export type DomainStatus = (typeof DOMAIN_STATUSES)[number];

export const DOMAIN_TYPES = [
  "platform_subdomain",
  "custom_domain",
] as const;

export type DomainType = (typeof DOMAIN_TYPES)[number];

/**
 * Normalizes a host or domain string for storage/matching:
 * - lowercases
 * - strips protocol, path, query, and port
 * - removes a leading "www."
 */
export function normalizeDomain(input: string): string {
  let value = input.trim().toLowerCase();
  if (!value) return "";

  // Strip protocol if present.
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  // Drop anything after the first path/query separator.
  value = value.split("/")[0] ?? value;
  value = value.split("?")[0] ?? value;
  // Remove port.
  value = value.split(":")[0] ?? value;
  // Trim trailing dots.
  value = value.replace(/\.+$/, "");
  // Remove a single leading www.
  if (value.startsWith("www.")) {
    value = value.slice(4);
  }
  return value;
}

const HOSTNAME_REGEX =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export function isValidDomain(value: string): boolean {
  return HOSTNAME_REGEX.test(value);
}

export function normalizeHostForMatch(host: string): string {
  return normalizeDomain(host);
}
