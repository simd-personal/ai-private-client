import { DecisionToolsSection } from "@/components/landing/decision-tools-section";
import { FinalCta } from "@/components/landing/final-cta";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { MarketSection } from "@/components/landing/market-section";
import { TrustSection } from "@/components/landing/trust-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <DecisionToolsSection />
      <HowItWorks />
      <TrustSection />
      <MarketSection />
      <FinalCta />
    </>
  );
}
