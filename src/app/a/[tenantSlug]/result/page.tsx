import { notFound } from "next/navigation";
import { ResultPageContent } from "@/components/report/result-page-content";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function TenantResultPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-beige/20 to-white">
      <ResultPageContent />
    </div>
  );
}
