import { notFound } from "next/navigation";
import { EquityQuiz } from "@/components/quiz/equity-quiz";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantEquityPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <EquityQuiz />;
}
