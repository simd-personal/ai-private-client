"use client";

import { motion } from "framer-motion";
import { CALIFORNIA_LUXURY_MARKETS } from "@/lib/constants";
import { useCurrentTenant } from "@/lib/tenants/current-tenant";

export function MarketSection() {
  const tenant = useCurrentTenant();
  const regionLabel =
    tenant.supportedStates.length === 1 &&
    tenant.supportedStates[0]?.toUpperCase() === "CA"
      ? "California"
      : tenant.supportedStates.join(", ");
  const marketList = tenant.serviceAreas.length
    ? tenant.serviceAreas
    : CALIFORNIA_LUXURY_MARKETS;
  return (
    <section className="px-6 py-20 bg-beige/30">
      <div className="mx-auto max-w-6xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-3xl text-navy mb-4">
            {regionLabel} Luxury Markets
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            {tenant.brandName} is currently licensed in {regionLabel} only. We
            serve discerning clients across premier coastal and urban luxury
            corridors. Out-of-state inquiries are welcomed — we can connect you
            with trusted referral partners.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {marketList.map((market) => (
              <span
                key={market}
                className="rounded-full border border-navy/10 bg-white px-4 py-2 text-sm text-navy shadow-sm"
              >
                {market}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
