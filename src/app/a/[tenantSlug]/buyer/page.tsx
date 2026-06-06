import { notFound } from "next/navigation";
import { BuyerQuiz } from "@/components/quiz/buyer-quiz";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantBuyerPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <BuyerQuiz />;
}
