import { notFound } from "next/navigation";
import { AdminPageView } from "@/app/admin/page";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantAdminPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <AdminPageView />;
}
