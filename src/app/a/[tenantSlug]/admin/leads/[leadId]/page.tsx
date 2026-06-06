import { notFound } from "next/navigation";
import { AdminLeadDetailPage } from "@/components/admin/admin-lead-detail-page";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantAdminLeadDetailRoute({
  params,
}: {
  params: Promise<{ tenantSlug: string; leadId: string }>;
}) {
  const { tenantSlug, leadId } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <AdminLeadDetailPage leadId={leadId} tenantSlug={tenantSlug} />;
}
