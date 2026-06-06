import { notFound } from "next/navigation";
import { WealthForecastQuiz } from "@/components/quiz/wealth-forecast-quiz";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantWealthForecastPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();
  return <WealthForecastQuiz />;
}
