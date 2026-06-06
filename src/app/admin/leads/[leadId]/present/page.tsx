import { PresentLeadPage } from "@/components/admin/admin-present-lead-page";

export default async function PresentLeadRoute({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = await params;
  return <PresentLeadPage leadId={leadId} />;
}
