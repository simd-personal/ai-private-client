import { getDefaultTenant } from "@/lib/tenants/tenant-config";

export function getBookingUrl(): string | null {
  const url = getDefaultTenant().bookingUrl;
  if (!url?.trim()) return null;
  return url.trim();
}

export function hasBookingUrl(): boolean {
  return getBookingUrl() !== null;
}
