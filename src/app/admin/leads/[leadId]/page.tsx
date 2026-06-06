import { AdminLeadDetailPage } from "@/components/admin/admin-lead-detail-page";

export default async function AdminLeadDetailRoute({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  return <AdminLeadDetailPage leadId={leadId} />;
}
