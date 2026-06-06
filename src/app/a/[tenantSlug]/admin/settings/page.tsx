import { notFound } from "next/navigation";
import { AdminSettingsPageView } from "@/app/admin/settings/page";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantAdminSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <AdminSettingsPageView />;
}
