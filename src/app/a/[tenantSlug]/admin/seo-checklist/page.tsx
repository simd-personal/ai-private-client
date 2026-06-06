import { notFound } from "next/navigation";
import { AdminSeoChecklistPageView } from "@/app/admin/seo-checklist/page";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantAdminSeoChecklistPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <AdminSeoChecklistPageView />;
}
