import { notFound } from "next/navigation";
import { AdminActivityPageView } from "@/app/admin/activity/page";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantAdminActivityPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <AdminActivityPageView />;
}
