import { notFound } from "next/navigation";
import { SellerQuiz } from "@/components/quiz/seller-quiz";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantSellerPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <SellerQuiz />;
}
