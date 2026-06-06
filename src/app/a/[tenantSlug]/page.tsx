import { notFound } from "next/navigation";
import { DecisionToolsSection } from "@/components/landing/decision-tools-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MarketSection } from "@/components/landing/market-section";
import { TrustSection } from "@/components/landing/trust-section";
import { findTenantBySlug } from "@/lib/tenants/tenant-resolver";

export default async function TenantHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const resolved = await findTenantBySlug(tenantSlug);
  if (!resolved) notFound();

  const { tenant } = resolved;

  return (
    <>
      <section className="bg-beige/20 px-6 py-4 text-center text-sm text-gray-600">
        <p className="mx-auto max-w-5xl">
          {tenant.brandName} · {tenant.agentName}
          {tenant.serviceAreas.length ? ` · ${tenant.serviceAreas.join(", ")}` : ""}
        </p>
      </section>
      <HeroSection />
      <DecisionToolsSection />
      <HowItWorks />
      <TrustSection />
      <MarketSection />
      <FinalCta />
    </>
  );
}
