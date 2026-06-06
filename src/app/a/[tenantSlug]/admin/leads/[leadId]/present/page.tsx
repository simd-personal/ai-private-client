import { PresentLeadPage } from "@/components/admin/admin-present-lead-page";

export default async function TenantPresentLeadRoute({
  params,
}: {
  params: Promise<{ tenantSlug: string; leadId: string }>;
}) {
  const { tenantSlug, leadId } = await params;
  return <PresentLeadPage leadId={leadId} tenantSlug={tenantSlug} />;
}
